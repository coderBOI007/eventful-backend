import { Request, Response } from "express";
import { AnalyticsService } from "../services/AnalyticsService";

export class AnalyticsController {
  /** GET /analytics/creator/:creatorId */
  static async creatorStats(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { creatorId } = req.params;

    // Only the creator themselves can view their analytics
    if (req.user.userId !== creatorId) {
      res.status(403).json({ error: "Forbidden", message: "You can only view your own analytics" });
      return;
    }

    const analytics = await AnalyticsService.getCreatorAnalytics(creatorId);
    res.status(200).json({ analytics });
  }

  /** GET /analytics/event/:eventId */
  static async eventStats(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { eventId } = req.params;
    const analytics = await AnalyticsService.getEventAnalytics(eventId, req.user.userId);
    res.status(200).json({ analytics });
  }
}