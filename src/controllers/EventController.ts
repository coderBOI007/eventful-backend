import { Request, Response } from "express";
import { EventService } from "../services/EventService";
import { CreateEventDto, UpdateEventDto } from "../types";

export class EventController {
  /** POST /events */
  static async create(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const dto = req.body as CreateEventDto;

    // Validate required fields
    const required = ["title", "description", "date", "venue", "ticketPrice", "capacity"];
    const missing = required.filter((f) => dto[f as keyof CreateEventDto] === undefined || dto[f as keyof CreateEventDto] === "");
    if (missing.length > 0) {
      res.status(400).json({ error: "Bad Request", message: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    if (typeof dto.ticketPrice !== "number" || dto.ticketPrice < 0) {
      res.status(400).json({ error: "Bad Request", message: "ticketPrice must be a non-negative number" });
      return;
    }
    if (typeof dto.capacity !== "number" || !Number.isInteger(dto.capacity) || dto.capacity < 1) {
      res.status(400).json({ error: "Bad Request", message: "capacity must be a positive integer" });
      return;
    }

    const event = await EventService.create(req.user.userId, dto);
    res.status(201).json({ event });
  }

  /** GET /events */
  static async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const events = await EventService.list(req.user.role, req.user.userId, page, limit);
    res.status(200).json({ events, meta: { page, limit, count: events.length } });
  }

  /** GET /events/:id */
  static async getOne(req: Request, res: Response): Promise<void> {
    const event = await EventService.getById(req.params.id);
    res.status(200).json({ event });
  }

  /** PUT /events/:id */
  static async update(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const dto = req.body as UpdateEventDto;
    const event = await EventService.update(req.params.id, req.user.userId, dto);
    res.status(200).json({ event });
  }

  /** DELETE /events/:id */
  static async cancel(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const event = await EventService.cancel(req.params.id, req.user.userId);
    res.status(200).json({ event, message: "Event cancelled" });
  }
}