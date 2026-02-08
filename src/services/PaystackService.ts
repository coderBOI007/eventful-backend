import { v4 as uuidv4 } from "uuid";
import { AppError } from "../middleware/errorHandler";
import { EventService } from "./EventService";
import { TicketService } from "./TicketService";
import { Payment, PaystackWebhookPayload } from "../types";

// ─── In-memory payment store (replace with Prisma in production) ──────────────
const paymentsDb: Map<string, Payment> = new Map();

// ─── Paystack HTTP client stub ──────────────────────────────────────────────
// In production this would use the official Paystack SDK or axios calls to
// https://api.paystack.co/transaction/initialize
// We model the interface here so the service logic is complete and testable.

interface PaystackInitResponse {
  status: boolean;
  data: {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  };
}

/**
 * Simulates a Paystack /transaction/initialize call.
 * Replace the body with a real HTTP request in production.
 */
async function paystackInitialize(params: {
  email: string;
  amount: number; // in kobo (NGN smallest unit)
  metadata?: Record<string, unknown>;
  reference?: string;
}): Promise<PaystackInitResponse> {
  // Stub: in production → axios.post("https://api.paystack.co/transaction/initialize", params, { headers })
  return {
    status: true,
    data: {
      authorizationUrl: `https://paystack.com/pay/${params.reference || uuidv4()}`,
      accessCode: uuidv4(),
      reference: params.reference || uuidv4(),
    },
  };
}

export class PaystackService {
  // ── Initialize transaction ────────────────────────────────────────────

  /**
   * Creates a pending ticket, then asks Paystack for an authorization URL.
   * The eventee is redirected to that URL to complete payment.
   *
   * Returns the pending ticket and the Paystack authorization URL.
   */
  static async initializePayment(
    eventId: string,
    eventeeId: string,
    email: string
  ): Promise<{ ticket: { id: string; eventId: string; status: string }; authorizationUrl: string; reference: string }> {
    // Validate event exists and is published
    const event = EventService.getByIdDirect(eventId);
    if (!event) throw new AppError("Event not found", 404);

    // Create a pending ticket first
    const ticket = await TicketService.createPending(eventId, eventeeId);

    // Amount in kobo (1 NGN = 100 kobo)
    const amountKobo = event.ticketPrice * 100;

    const paystackRef = `evt_${ticket.id}_${Date.now()}`;

    const response = await paystackInitialize({
      email,
      amount: amountKobo,
      reference: paystackRef,
      metadata: { ticketId: ticket.id, eventId },
    });

    // Persist a pending payment record
    const payment: Payment = {
      id: uuidv4(),
      ticketId: ticket.id,
      paystackRef: paystackRef,
      amount: event.ticketPrice,
      status: "pending",
      paidAt: null,
    };
    paymentsDb.set(payment.id, payment);

    return {
      ticket: { id: ticket.id, eventId: ticket.eventId, status: ticket.status },
      authorizationUrl: response.data.authorizationUrl,
      reference: paystackRef,
    };
  }

  // ── Webhook handler ───────────────────────────────────────────────────

  /**
   * Processes an incoming Paystack webhook payload.
   *
   * On "charge.success":
   *   1. Find the payment record by reference.
   *   2. Mark the payment as successful.
   *   3. Tell TicketService to confirm the ticket (which generates the QR).
   *
   * On "charge.failed": mark the payment as failed.
   *
   * Any other event is silently ignored (Paystack sends many event types).
   */
  static async handleWebhook(payload: PaystackWebhookPayload): Promise<{ handled: boolean }> {
    const { event, data } = payload;

    if (event !== "charge.success" && event !== "charge.failed") {
      return { handled: false }; // Not an event we care about
    }

    // Find the payment by Paystack reference
    const payment = PaystackService.findByReference(data.reference);
    if (!payment) {
      // Could be a duplicate or unknown reference — log and acknowledge
      console.warn(`[Paystack Webhook] No payment found for reference: ${data.reference}`);
      return { handled: false };
    }

    if (event === "charge.success") {
      payment.status = "success";
      payment.paidAt = new Date();
      paymentsDb.set(payment.id, payment);

      // Confirm the ticket and generate QR
      await TicketService.confirmPayment(payment.ticketId);
      console.log(`[Paystack] Payment confirmed for ticket ${payment.ticketId}`);
    } else {
      // charge.failed
      payment.status = "failed";
      paymentsDb.set(payment.id, payment);

      // Cancel the pending ticket
      const ticket = TicketService.getByIdDirect(payment.ticketId);
      if (ticket && ticket.status === "pending") {
        ticket.status = "cancelled";
      }
      console.log(`[Paystack] Payment failed for ticket ${payment.ticketId}`);
    }

    return { handled: true };
  }

  // ── Get payments for a creator ────────────────────────────────────────

  /**
   * Returns all payment records for events owned by a given creator.
   */
  static async getCreatorPayments(creatorId: string): Promise<Payment[]> {
    const allTickets = TicketService.getAllDirect();
    const creatorEventIds = new Set<string>();

    // Collect event IDs owned by this creator
    for (const ticket of allTickets) {
      const event = EventService.getByIdDirect(ticket.eventId);
      if (event && event.creatorId === creatorId) {
        creatorEventIds.add(ticket.eventId);
      }
    }

    // Filter payments to only those whose ticket belongs to a creator's event
    const payments: Payment[] = [];
    for (const payment of paymentsDb.values()) {
      const ticket = TicketService.getByIdDirect(payment.ticketId);
      if (ticket && creatorEventIds.has(ticket.eventId)) {
        payments.push(payment);
      }
    }

    return payments;
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  /** Look up a payment by its Paystack reference string. */
  static findByReference(reference: string): Payment | undefined {
    for (const payment of paymentsDb.values()) {
      if (payment.paystackRef === reference) return payment;
    }
    return undefined;
  }

  /** Direct access — used by AnalyticsService. */
  static getAllDirect(): Payment[] {
    return Array.from(paymentsDb.values());
  }
}