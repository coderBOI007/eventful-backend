import { Request, Response } from "express";
import { TicketService } from "../services/TicketService";
import { PaystackService } from "../services/PaystackService";

export class TicketController {
  /** POST /events/:eventId/tickets — initiate purchase */
  static async purchase(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { eventId } = req.params;
    const email = req.user.email;

    const result = await PaystackService.initializePayment(eventId, req.user.userId, email);

    res.status(201).json({
      ticket: result.ticket,
      payment: {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
      },
      message: "Redirect the user to authorizationUrl to complete payment",
    });
  }

  /**
   * GET /events/:eventId/tickets/verify/:qrToken
   *
   * This endpoint is called at the event door to scan a ticket.
   * It ALWAYS hits the database — never cached — to prevent double-entry.
   */
  static async verifyQR(req: Request, res: Response): Promise<void> {
    const { qrToken } = req.params;

    const { valid, ticket } = await TicketService.verifyQR(qrToken);

    res.status(200).json({
      valid,
      ticket: {
        id: ticket.id,
        eventId: ticket.eventId,
        status: ticket.status,
      },
      message: valid ? "Ticket verified. Entry granted." : "Ticket invalid or already used.",
    });
  }

  /** GET /tickets/me — list all tickets for the authenticated eventee */
  static async myTickets(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tickets = await TicketService.listByEventee(req.user.userId);
    res.status(200).json({ tickets });
  }
}