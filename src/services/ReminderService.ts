import { v4 as uuidv4 } from "uuid";
import { AppError } from "../middleware/errorHandler";
import { EventService } from "./EventService";
import { Reminder, ReminderInput } from "../types";

// ─── In-memory reminder store (replace with Prisma in production) ─────────────
const remindersDb: Map<string, Reminder> = new Map();

export class ReminderService {
  // ── Creator: set default reminders for an event ────────────────────────

  /**
   * The creator sets one or more reminders that apply to ALL eventees
   * who purchase a ticket for this event (unless the eventee overrides).
   *
   * Replaces any existing event-level reminders for this event.
   */
  static async createEventReminders(
    eventId: string,
    creatorId: string,
    inputs: ReminderInput[]
  ): Promise<Reminder[]> {
    const event = EventService.getByIdDirect(eventId);
    if (!event) throw new AppError("Event not found", 404);
    if (event.creatorId !== creatorId) throw new AppError("Not your event", 403);

    // Remove old event-level reminders for this event
    for (const [id, r] of remindersDb.entries()) {
      if (r.eventId === eventId && r.ticketId === null) {
        remindersDb.delete(id);
      }
    }

    const created: Reminder[] = [];
    for (const input of inputs) {
      ReminderService.validateInput(input, event.date);

      const reminder: Reminder = {
        id: uuidv4(),
        ticketId: null,        // event-level reminder
        eventId,
        userId: creatorId,    // owner for record-keeping
        unit: input.unit,
        value: input.value,
        remindAt: ReminderService.computeRemindAt(event.date, input),
        sent: false,
      };

      remindersDb.set(reminder.id, reminder);
      created.push(reminder);
    }

    return created;
  }

  // ── Eventee: set personal reminders for a ticket ───────────────────────

  /**
   * The eventee sets their own reminder(s) for a specific ticket.
   * These override any event-level defaults for this eventee.
   *
   * Replaces any existing ticket-level reminders for this ticket.
   */
  static async createTicketReminders(
    ticketId: string,
    eventId: string,
    eventeeId: string,
    inputs: ReminderInput[]
  ): Promise<Reminder[]> {
    const event = EventService.getByIdDirect(eventId);
    if (!event) throw new AppError("Event not found", 404);

    // Remove old ticket-level reminders
    for (const [id, r] of remindersDb.entries()) {
      if (r.ticketId === ticketId) {
        remindersDb.delete(id);
      }
    }

    const created: Reminder[] = [];
    for (const input of inputs) {
      ReminderService.validateInput(input, event.date);

      const reminder: Reminder = {
        id: uuidv4(),
        ticketId,
        eventId,
        userId: eventeeId,
        unit: input.unit,
        value: input.value,
        remindAt: ReminderService.computeRemindAt(event.date, input),
        sent: false,
      };

      remindersDb.set(reminder.id, reminder);
      created.push(reminder);
    }

    return created;
  }

  // ── Get pending reminders (used by the Bull job worker) ─────────────────

  /**
   * Returns all reminders whose `remindAt` is ≤ now and haven't been sent yet.
   * The reminder job polls this every 30 seconds.
   */
  static getPendingReminders(): Reminder[] {
    const now = new Date();
    const pending: Reminder[] = [];
    for (const reminder of remindersDb.values()) {
      if (!reminder.sent && reminder.remindAt <= now) {
        pending.push(reminder);
      }
    }
    return pending;
  }

  /** Mark a reminder as sent. */
  static markSent(reminderId: string): void {
    const reminder = remindersDb.get(reminderId);
    if (reminder) {
      reminder.sent = true;
      remindersDb.set(reminderId, reminder);
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  /**
   * Computes the absolute timestamp at which the reminder should fire.
   *
   *   remindAt = eventDate − (value × unitMs)
   *
   * Examples:
   *   { unit: "hour", value: 2 }  → 2 hours before the event
   *   { unit: "day",  value: 1 }  → 1 day before
   *   { unit: "week", value: 1 }  → 1 week before
   */
  static computeRemindAt(eventDate: Date, input: ReminderInput): Date {
    const unitMs: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const offset = input.value * (unitMs[input.unit] || 0);
    return new Date(eventDate.getTime() - offset);
  }

  /** Basic validation on the reminder input. */
  private static validateInput(input: ReminderInput, eventDate: Date): void {
    const validUnits = ["hour", "day", "week"];
    if (!validUnits.includes(input.unit)) {
      throw new AppError(`Invalid reminder unit. Must be one of: ${validUnits.join(", ")}`, 400);
    }
    if (!Number.isInteger(input.value) || input.value < 1) {
      throw new AppError("Reminder value must be a positive integer", 400);
    }

    // The computed remindAt must be in the future
    const remindAt = ReminderService.computeRemindAt(eventDate, input);
    if (remindAt <= new Date()) {
      throw new AppError("The computed reminder time is already in the past", 400);
    }
  }
}