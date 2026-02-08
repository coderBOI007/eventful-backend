import { Request, Response } from "express";
import { SharingService } from "../services/SharingService";

export class SharingController {
  /** GET /events/:eventId/share */
  static async getShareMeta(req: Request, res: Response): Promise<void> {
    const { eventId } = req.params;
    const meta = await SharingService.getShareMeta(eventId);
    res.status(200).json(meta);
  }
}