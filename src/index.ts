import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { globalLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { startReminderPoller } from "./jobs/reminderJob";
import { connectDatabase } from "./config/database";

// ─── Route imports ────────────────────────────────────────────────────────────
import authRouter from "./routes/auth.router";
import eventsRouter from "./routes/events.router";
import ticketsRouter from "./routes/tickets.router";
import paymentsRouter from "./routes/payments.router";
import notificationsRouter from "./routes/notifications.router";
import sharingRouter from "./routes/sharing.router";
import analyticsRouter from "./routes/analytics.router";

// ═══════════════════════════════════════════════════════════════════════════════
const app = express();

// ─── Security & parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Global rate limiter ─────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Swagger docs ────────────────────────────────────────────────────────────
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── API routes (all prefixed with /v1) ──────────────────────────────────────
app.use("/v1/auth", authRouter);
app.use("/v1/events", eventsRouter);

// Ticket routes: purchase is POST /v1/events/:eventId/tickets
//                verify  is GET  /v1/events/:eventId/tickets/verify/:qrToken
//                myTickets is GET /v1/tickets/me
app.use("/v1/events", ticketsRouter);
app.use("/v1/tickets", ticketsRouter);

app.use("/v1/payments", paymentsRouter);
app.use("/v1", notificationsRouter);       // PUT /v1/events/:id/reminders & PUT /v1/tickets/:id/reminders
app.use("/v1", sharingRouter);             // GET /v1/events/:id/share
app.use("/v1/analytics", analyticsRouter);

// ─── Catch-all & error handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found", message: "The requested endpoint does not exist" });
});
app.use(errorHandler);

// ─── Start with MongoDB connection ────────────────────────────────────────────
const PORT = config.PORT;

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║   Eventful API running on port ${PORT}        ║`);
    console.log(`║   Swagger docs → http://localhost:${PORT}/docs ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);

    startReminderPoller();
  });
});

export default app;
