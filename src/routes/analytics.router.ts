import { Router } from "express";
import { AnalyticsController } from "../controllers/AnalyticsController";
import { authMiddleware } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /analytics/creator/{creatorId}:
 *   get:
 *     summary: Lifetime analytics for a creator
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: creatorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: |
 *           Aggregated stats: totalAttendees, totalTicketsSold, totalQrScans, totalRevenue
 *       403:
 *         description: Not authorized
 */
router.get(
  "/creator/:creatorId",
  authMiddleware,
  roleGuard("creator"),
  asyncHandler(AnalyticsController.creatorStats)
);

/**
 * @swagger
 * /analytics/event/{eventId}:
 *   get:
 *     summary: Per-event analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: |
 *           Event-level stats: ticketsSold, qrScans, revenue, showUpRate (%)
 *       403:
 *         description: Not your event
 *       404:
 *         description: Event not found
 */
router.get(
  "/event/:eventId",
  authMiddleware,
  roleGuard("creator"),
  asyncHandler(AnalyticsController.eventStats)
);

export default router;