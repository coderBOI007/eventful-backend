import request from "supertest";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRouter from "../../src/routes/auth.router";
import eventsRouter from "../../src/routes/events.router";
import ticketsRouter from "../../src/routes/tickets.router";
import paymentsRouter from "../../src/routes/payments.router";
import { errorHandler } from "../../src/middleware/errorHandler";
import { globalLimiter } from "../../src/middleware/rateLimiter";

// ─── Stub Redis for integration tests ──────────────────────────────────────
jest.mock("../../src/cache/redisClient", () => ({
  cache: {
    getOrSet: async (_key: string, factory: () => Promise<unknown>) => factory(),
    set: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn(),
  },
  redisClient: { on: jest.fn() },
}));

// ─── Stub Bull so the reminder job doesn't try to connect to Redis ─────────
jest.mock("bull", () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
  }));
});

// ─── Build a minimal Express app for testing ───────────────────────────────
function buildApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  // Skip global rate limiter in tests to avoid flakiness
  // app.use(globalLimiter);

  app.use("/v1/auth", authRouter);
  app.use("/v1/events", eventsRouter);
  app.use("/v1/events", ticketsRouter);   // tickets are nested under /events/:id/tickets
  app.use("/v1/tickets", ticketsRouter);  // also mounted at /v1/tickets/me
  app.use("/v1/payments", paymentsRouter);

  app.use(errorHandler);
  return app;
}

const app = buildApp();

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: register + login and return the token
// ═══════════════════════════════════════════════════════════════════════════════
async function registerAndLogin(
  email: string,
  role: "creator" | "eventee"
): Promise<{ token: string; userId: string }> {
  await request(app).post("/v1/auth/register").send({
    email,
    password: "testpass123",
    name: role === "creator" ? "Test Creator" : "Test Eventee",
    role,
  });

  const loginRes = await request(app)
    .post("/v1/auth/login")
    .send({ email, password: "testpass123" });

  return {
    token: loginRes.body.tokens.accessToken,
    userId: loginRes.body.user.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════════
describe("Integration: Auth Flow", () => {
  it("should register and return a user object", async () => {
    const res = await request(app).post("/v1/auth/register").send({
      email: "integration_auth@test.com",
      password: "hello123",
      name: "Integration User",
      role: "eventee",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("integration_auth@test.com");
    expect(res.body.user.role).toBe("eventee");
  });

  it("should reject registration with missing fields", async () => {
    const res = await request(app).post("/v1/auth/register").send({
      email: "incomplete@test.com",
    });

    expect(res.status).toBe(400);
  });

  it("should login and return access + refresh tokens", async () => {
    await request(app).post("/v1/auth/register").send({
      email: "logintest@test.com",
      password: "pass123",
      name: "Login Tester",
      role: "creator",
    });

    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "logintest@test.com", password: "pass123" });

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
  });

  it("should return the authenticated user via GET /auth/me", async () => {
    const { token } = await registerAndLogin("metest@test.com", "eventee");

    const res = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("metest@test.com");
  });

  it("should reject /auth/me without a token", async () => {
    const res = await request(app).get("/v1/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Integration: Events CRUD", () => {
  let creatorToken: string;

  beforeAll(async () => {
    const result = await registerAndLogin("eventcreator@test.com", "creator");
    creatorToken = result.token;
  });

  it("should create an event as a creator", async () => {
    const res = await request(app)
      .post("/v1/events")
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({
        title: "Tech Summit 2026",
        description: "A grand tech event",
        date: "2026-12-01T18:00:00.000Z",
        venue: "Lagos Convention Centre",
        ticketPrice: 5000,
        capacity: 200,
      });

    expect(res.status).toBe(201);
    expect(res.body.event.title).toBe("Tech Summit 2026");
    expect(res.body.event.status).toBe("draft");
  });

  it("should reject event creation by an eventee", async () => {
    const { token } = await registerAndLogin("notacreator@test.com", "eventee");

    const res = await request(app)
      .post("/v1/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Sneaky Event",
        description: "Should fail",
        date: "2026-12-01T18:00:00.000Z",
        venue: "Nowhere",
        ticketPrice: 100,
        capacity: 10,
      });

    expect(res.status).toBe(403);
  });

  it("should list creator's own events", async () => {
    const res = await request(app)
      .get("/v1/events")
      .set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
  });
});

describe("Integration: Full Ticket Purchase + QR Verification", () => {
  let creatorToken: string;
  let eventeeToken: string;
  let eventId: string;
  let ticketId: string;
  let qrToken: string;

  beforeAll(async () => {
    // 1. Register creator and eventee
    const creator = await registerAndLogin("fullflow_creator@test.com", "creator");
    creatorToken = creator.token;

    const eventee = await registerAndLogin("fullflow_eventee@test.com", "eventee");
    eventeeToken = eventee.token;

    // 2. Creator creates and publishes an event
    const createRes = await request(app)
      .post("/v1/events")
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({
        title: "Full Flow Concert",
        description: "End-to-end test event",
        date: "2026-08-20T20:00:00.000Z",
        venue: "Victoria Island Arena",
        ticketPrice: 2500,
        capacity: 100,
      });
    eventId = createRes.body.event.id;

    // Publish the event
    await request(app)
      .put(`/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({ status: "published" });
  });

  it("should allow an eventee to initiate a ticket purchase", async () => {
    const res = await request(app)
      .post(`/v1/events/${eventId}/tickets`)
      .set("Authorization", `Bearer ${eventeeToken}`);

    expect(res.status).toBe(201);
    expect(res.body.ticket.id).toBeDefined();
    expect(res.body.ticket.status).toBe("pending");
    expect(res.body.payment.authorizationUrl).toBeDefined();

    ticketId = res.body.ticket.id;
  });

  it("should simulate a successful Paystack webhook and confirm the ticket", async () => {
    // We need the Paystack reference — find it via the payment record
    // For simplicity, we call the webhook with the expected reference format
    const { PaystackService } = await import("../../src/services/PaystackService");
    const payment = PaystackService.findByReference(`evt_${ticketId}_`);

    // Since the reference includes a timestamp we can't predict exactly,
    // we'll find it by scanning all payments
    const allPayments = PaystackService.getAllDirect();
    const ourPayment = allPayments.find((p) => p.ticketId === ticketId);
    expect(ourPayment).toBeDefined();

    // Simulate the webhook (bypassing signature check for the test)
    const { PaystackService: PS } = await import("../../src/services/PaystackService");
    const result = await PS.handleWebhook({
      event: "charge.success",
      data: {
        reference: ourPayment!.paystackRef,
        amount: 250000, // 2500 NGN in kobo
        status: "success",
      },
    });

    expect(result.handled).toBe(true);
  });

  it("should have generated a QR token after payment confirmation", async () => {
    const { TicketService } = await import("../../src/services/TicketService");
    const ticket = TicketService.getByIdDirect(ticketId);

    expect(ticket).toBeDefined();
    expect(ticket!.status).toBe("paid");
    expect(ticket!.qrToken).toBeDefined();
    expect(typeof ticket!.qrToken).toBe("string");

    qrToken = ticket!.qrToken!;
  });

  it("should verify the QR code successfully on first scan", async () => {
    const res = await request(app).get(`/v1/events/${eventId}/tickets/verify/${qrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.ticket.status).toBe("scanned");
  });

  it("should reject the same QR code on a second scan (already used)", async () => {
    const res = await request(app).get(`/v1/events/${eventId}/tickets/verify/${qrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.ticket.status).toBe("scanned");
  });
});