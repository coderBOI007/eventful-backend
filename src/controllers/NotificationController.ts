import { Request, Response } from "express";
import { ReminderService } from "../services/ReminderService";
import { TicketService } from "../services/TicketService";
import { AppError } from "../middleware/errorHandler";
import { ReminderInput } from "../types";

export class NotificationController {
  /** PUT /events/:eventId/reminders — creator sets event-level reminders */
  static async setEventReminders(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { eventId } = req.params;
    const { reminders } = req.body as { reminders: ReminderInput[] };

    if (!Array.isArray(reminders) || reminders.length === 0) {
      res.status(400).json({ error: "Bad Request", message: "reminders must be a non-empty array" });
      return;
    }

    const created = await ReminderService.createEventReminders(eventId, req.user.userId, reminders);
    res.status(200).json({ reminders: created, message: "Event reminders updated" });
  }

  /** PUT /tickets/:ticketId/reminders — eventee sets personal ticket reminders */
  static async setTicketReminders(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { ticketId } = req.params;
    const { reminders } = req.body as { reminders: ReminderInput[] };

    if (!Array.isArray(reminders) || reminders.length === 0) {
      res.status(400).json({ error: "Bad Request", message: "reminders must be a non-empty array" });
      return;
    }

    // Look up the ticket to get the eventId and verify ownership
    const ticket = TicketService.getByIdDirect(ticketId);
    if (!ticket) {
      throw new AppError("Ticket not found", 404);
    }
    if (ticket.eventeeId !== req.user.userId) {
      throw new AppError("Not your ticket", 403);
    }

    const created = await ReminderService.createTicketReminders(
      ticketId,
      ticket.eventId,
      req.user.userId,
      reminders
    );

    res.status(200).json({ reminders: created, message: "Ticket reminders updated" });
  }
}