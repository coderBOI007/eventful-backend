import { v4 as uuidv4 } from "uuid";
import { cache } from "../cache/redisClient";
import { AppError } from "../middleware/errorHandler";
import { EventService } from "./EventService";
import { QRService } from "./QRService";
import { Ticket } from "../types";

// ─── In-memory ticket store (replace with Prisma in production) ───────────────
const ticketsDb: Map<string, Ticket> = new Map();

export class TicketService {
  // ── Create (pending) ────────────────────────────────────────────────────

  /**
   * Validates capacity, creates a PENDING ticket, and returns it.
   * The ticket moves to "paid" only after the Paystack webhook confirms payment.
   */
  static async createPending(eventId: string, eventeeId: string): Promise<Ticket> {
    const event = EventService.getByIdDirect(eventId);
    if (!event) throw new AppError("Event not found", 404);
    if (event.status !== "published") throw new AppError("Event is not available for purchase", 400);

    // Capacity check: count paid + pending tickets for this event
    const currentCount = Array.from(ticketsDb.values()).filter(
      (t) => t.eventId === eventId && (t.status === "paid" || t.status === "pending" || t.status === "scanned")
    ).length;

    if (currentCount >= event.capacity) {
      throw new AppError("Event is sold out", 409);
    }

    const ticket: Ticket = {
      id: uuidv4(),
      eventId,
      eventeeId,
      status: "pending",
      qrToken: null,
      purchasedAt: new Date(),
    };

    ticketsDb.set(ticket.id, ticket);
    return ticket;
  }

  // ── Confirm payment → generate QR ──────────────────────────────────────

  /**
   * Called by PaystackService after a successful webhook.
   * Transitions the ticket to "paid" and issues a signed QR token.
   */
  static async confirmPayment(ticketId: string): Promise<Ticket> {
    const ticket = ticketsDb.get(ticketId);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const { token } = await QRService.generate(ticket.id, ticket.eventId);

    ticket.status = "paid";
    ticket.qrToken = token;
    ticketsDb.set(ticketId, ticket);

    // Bust the eventee's ticket-list cache
    await cache.del(`tickets:eventee:${ticket.eventeeId}`);

    return ticket;
  }

  // ── QR Verification (ALWAYS hits DB — never cached) ─────────────────────

  /**
   * Validates the QR token signature, then checks the live ticket state.
   * Returns { valid, ticket } on success.
   *
   * This method MUST NOT use the cache layer.  A stale "paid" status could
   * allow a ticket that has already been scanned to be admitted again.
   */
  static async verifyQR(qrToken: string): Promise<{ valid: boolean; ticket: Ticket }> {
    // 1. Cryptographic verification (no DB needed yet)
    const payload = QRService.verify(qrToken);

    // 2. Live DB lookup — the single source of truth
    const ticket = ticketsDb.get(payload.ticketId);
    if (!ticket) {
      throw new AppError("Ticket not found", 404);
    }

    // 3. State checks
    if (ticket.status === "scanned") {
      return { valid: false, ticket }; // Already used
    }
    if (ticket.status !== "paid") {
      return { valid: false, ticket }; // Not yet paid or cancelled
    }
    if (ticket.eventId !== payload.eventId) {
      return { valid: false, ticket }; // Event mismatch (token tampering attempt)
    }

    // 4. Mark as scanned
    ticket.status = "scanned";
    ticketsDb.set(ticket.id, ticket);

    return { valid: true, ticket };
  }

  // ── List eventee's tickets ──────────────────────────────────────────────

  /**
   * Returns all tickets for a given eventee.  Cached for 5 minutes.
   */
  static async listByEventee(eventeeId: string): Promise<Ticket[]> {
    return cache.getOrSet<Ticket[]>(
      `tickets:eventee:${eventeeId}`,
      async () => {
        return Array.from(ticketsDb.values()).filter((t) => t.eventeeId === eventeeId);
      },
      300 // 5 min
    );
  }

  // ── Cancel ──────────────────────────────────────────────────────────────

  static async cancel(ticketId: string, eventeeId: string): Promise<Ticket> {
    const ticket = ticketsDb.get(ticketId);
    if (!ticket) throw new AppError("Ticket not found", 404);
    if (ticket.eventeeId !== eventeeId) throw new AppError("Not your ticket", 403);
    if (ticket.status === "scanned") throw new AppError("Cannot cancel a scanned ticket", 400);

    ticket.status = "cancelled";
    ticketsDb.set(ticketId, ticket);
    await cache.del(`tickets:eventee:${eventeeId}`);

    return ticket;
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  /** Direct DB access — used by PaystackService and AnalyticsService. */
  static getByIdDirect(ticketId: string): Ticket | undefined {
    return ticketsDb.get(ticketId);
  }

  /** All tickets (no filter). Used by analytics. */
  static getAllDirect(): Ticket[] {
    return Array.from(ticketsDb.values());
  }
}