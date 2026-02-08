import { v4 as uuidv4 } from "uuid";
import { cache } from "../cache/redisClient";
import { AppError } from "../middleware/errorHandler";
import { ReminderService } from "./ReminderService";
import { Event, CreateEventDto, UpdateEventDto } from "../types";

// ─── In-memory event store (replace with Prisma in production) ────────────────
const eventsDb: Map<string, Event> = new Map();

export class EventService {
  // ── Create ──────────────────────────────────────────────────────────────

  /**
   * Creates a new event owned by `creatorId`.
   * If reminders are supplied, they are persisted via ReminderService.
   */
  static async create(creatorId: string, dto: CreateEventDto): Promise<Event> {
    const eventDate = new Date(dto.date);
    if (isNaN(eventDate.getTime())) {
      throw new AppError("Invalid date format", 400);
    }
    if (eventDate <= new Date()) {
      throw new AppError("Event date must be in the future", 400);
    }

    const event: Event = {
      id: uuidv4(),
      creatorId,
      title: dto.title.trim(),
      description: dto.description.trim(),
      date: eventDate,
      venue: dto.venue.trim(),
      ticketPrice: dto.ticketPrice,
      capacity: dto.capacity,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    eventsDb.set(event.id, event);

    // If the creator supplied default reminders, store them
    if (dto.reminders && dto.reminders.length > 0) {
      await ReminderService.createEventReminders(event.id, creatorId, dto.reminders);
    }

    // Bust the listings cache
    await cache.del("events:list");

    return event;
  }

  // ── List ────────────────────────────────────────────────────────────────

  /**
   * For creators: return only their own events.
   * For eventees: return all published events.
   * Cached for 2 minutes.
   */
  static async list(role: string, userId: string, page = 1, limit = 20): Promise<Event[]> {
    const cacheKey = `events:list:${role}:${userId}:${page}:${limit}`;

    return cache.getOrSet<Event[]>(
      cacheKey,
      async () => {
        const all = Array.from(eventsDb.values());

        if (role === "creator") {
          return all.filter((e) => e.creatorId === userId);
        }
        // eventees see only published events
        return all.filter((e) => e.status === "published");
      },
      120 // 2 min
    );
  }

  // ── Get by ID ───────────────────────────────────────────────────────────

  /**
   * Fetches a single event.  Cached for 5 minutes (read-through).
   */
  static async getById(eventId: string): Promise<Event> {
    return cache.getOrSet<Event>(
      `event:${eventId}`,
      async () => {
        const event = eventsDb.get(eventId);
        if (!event) throw new AppError("Event not found", 404);
        return event;
      },
      300 // 5 min
    );
  }

  // ── Update ──────────────────────────────────────────────────────────────

  /**
   * Updates an event.  Only the owning creator may update.
   * Invalidates per-event and listing caches.
   */
  static async update(eventId: string, creatorId: string, dto: UpdateEventDto): Promise<Event> {
    const event = eventsDb.get(eventId);
    if (!event) throw new AppError("Event not found", 404);
    if (event.creatorId !== creatorId) throw new AppError("You can only update your own events", 403);

    if (dto.title !== undefined) event.title = dto.title.trim();
    if (dto.description !== undefined) event.description = dto.description.trim();
    if (dto.venue !== undefined) event.venue = dto.venue.trim();
    if (dto.ticketPrice !== undefined) event.ticketPrice = dto.ticketPrice;
    if (dto.capacity !== undefined) event.capacity = dto.capacity;
    if (dto.status !== undefined) event.status = dto.status;
    if (dto.date !== undefined) {
      const d = new Date(dto.date);
      if (isNaN(d.getTime())) throw new AppError("Invalid date format", 400);
      event.date = d;
    }
    event.updatedAt = new Date();

    eventsDb.set(eventId, event);

    // Bust caches
    await cache.del(`event:${eventId}`, "events:list");

    return event;
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  /**
   * Soft-deletes (sets status to "cancelled").  Only the owning creator may cancel.
   */
  static async cancel(eventId: string, creatorId: string): Promise<Event> {
    return EventService.update(eventId, creatorId, { status: "cancelled" });
  }

  // ── Internal: direct DB lookup (no cache) ──────────────────────────────
  /** Used internally when we need the latest state without caching. */
  static getByIdDirect(eventId: string): Event | undefined {
    return eventsDb.get(eventId);
  }
}