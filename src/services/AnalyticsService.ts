import { cache } from "../cache/redisClient";
import { AppError } from "../middleware/errorHandler";
import { EventService } from "./EventService";
import { TicketService } from "./TicketService";
import { PaystackService } from "./PaystackService";
import { CreatorAnalytics, EventAnalytics } from "../types";

export class AnalyticsService {
  // ── Lifetime creator stats ────────────────────────────────────────────

  /**
   * Aggregates lifetime metrics across all events owned by a creator.
   * Cached for 10 minutes (background-refresh pattern).
   *
   * Metrics:
   *   - totalAttendees  : unique eventees who hold paid/scanned tickets
   *   - totalTicketsSold: tickets in "paid" or "scanned" status
   *   - totalQrScans    : tickets that reached "scanned"
   *   - totalRevenue    : sum of successful payments
   */
  static async getCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    return cache.getOrSet<CreatorAnalytics>(
      `analytics:creator:${creatorId}`,
      () => AnalyticsService.computeCreatorAnalytics(creatorId),
      600 // 10 min
    );
  }

  // ── Per-event stats ─────────────────────────────────────────────────────

  /**
   * Detailed stats for a single event.  The requesting creator must own it.
   * Cached for 10 minutes.
   *
   * Metrics:
   *   - ticketsSold : paid + scanned
   *   - qrScans     : scanned only
   *   - revenue     : sum of successful payments for this event's tickets
   *   - showUpRate  : (qrScans / ticketsSold) × 100  (percentage)
   */
  static async getEventAnalytics(eventId: string, creatorId: string): Promise<EventAnalytics> {
    const event = EventService.getByIdDirect(eventId);
    if (!event) throw new AppError("Event not found", 404);
    if (event.creatorId !== creatorId) throw new AppError("Not your event", 403);

    return cache.getOrSet<EventAnalytics>(
      `analytics:event:${eventId}`,
      () => AnalyticsService.computeEventAnalytics(eventId),
      600 // 10 min
    );
  }

  // ── Internal computation ────────────────────────────────────────────────

  private static async computeCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    const allTickets = TicketService.getAllDirect();
    const allPayments = PaystackService.getAllDirect();

    // Collect event IDs this creator owns
    const creatorEventIds = new Set<string>();
    // We iterate all tickets; for each, check if its event belongs to creator
    for (const ticket of allTickets) {
      const event = EventService.getByIdDirect(ticket.eventId);
      if (event && event.creatorId === creatorId) {
        creatorEventIds.add(ticket.eventId);
      }
    }

    let totalTicketsSold = 0;
    let totalQrScans = 0;
    const uniqueAttendees = new Set<string>();

    for (const ticket of allTickets) {
      if (!creatorEventIds.has(ticket.eventId)) continue;

      if (ticket.status === "paid" || ticket.status === "scanned") {
        totalTicketsSold++;
        uniqueAttendees.add(ticket.eventeeId);
      }
      if (ticket.status === "scanned") {
        totalQrScans++;
      }
    }

    // Revenue: sum of successful payments for tickets in creator's events
    let totalRevenue = 0;
    for (const payment of allPayments) {
      if (payment.status !== "success") continue;
      const ticket = TicketService.getByIdDirect(payment.ticketId);
      if (ticket && creatorEventIds.has(ticket.eventId)) {
        totalRevenue += payment.amount;
      }
    }

    return {
      totalAttendees: uniqueAttendees.size,
      totalTicketsSold,
      totalQrScans,
      totalRevenue,
    };
  }

  private static async computeEventAnalytics(eventId: string): Promise<EventAnalytics> {
    const allTickets = TicketService.getAllDirect();
    const allPayments = PaystackService.getAllDirect();

    let ticketsSold = 0;
    let qrScans = 0;
    const ticketIdsForEvent = new Set<string>();

    for (const ticket of allTickets) {
      if (ticket.eventId !== eventId) continue;
      ticketIdsForEvent.add(ticket.id);

      if (ticket.status === "paid" || ticket.status === "scanned") {
        ticketsSold++;
      }
      if (ticket.status === "scanned") {
        qrScans++;
      }
    }

    let revenue = 0;
    for (const payment of allPayments) {
      if (payment.status === "success" && ticketIdsForEvent.has(payment.ticketId)) {
        revenue += payment.amount;
      }
    }

    const showUpRate = ticketsSold > 0 ? (qrScans / ticketsSold) * 100 : 0;

    return {
      eventId,
      ticketsSold,
      qrScans,
      revenue,
      showUpRate: Math.round(showUpRate * 100) / 100, // 2 decimal places
    };
  }
}