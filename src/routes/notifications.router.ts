import { Router } from "express";
import { NotificationController } from "../controllers/NotificationController";
import { authMiddleware } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /events/{eventId}/reminders:
 *   put:
 *     summary: Set default reminders for an event (creator only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reminders]
 *             properties:
 *               reminders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [unit, value]
 *                   properties:
 *                     unit:
 *                       type: string
 *                       enum: [hour, day, week]
 *                     value:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Reminders updated
 *       403:
 *         description: Not your event
 */
router.put(
  "/events/:eventId/reminders",
  authMiddleware,
  roleGuard("creator"),
  asyncHandler(NotificationController.setEventReminders)
);

/**
 * @swagger
 * /tickets/{ticketId}/reminders:
 *   put:
 *     summary: Set personal reminders for a ticket (eventee only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reminders]
 *             properties:
 *               reminders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [unit, value]
 *                   properties:
 *                     unit:
 *                       type: string
 *                       enum: [hour, day, week]
 *                     value:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Reminders updated
 *       404:
 *         description: Ticket not found
 */
router.put(
  "/tickets/:ticketId/reminders",
  authMiddleware,
  roleGuard("eventee"),
  asyncHandler(NotificationController.setTicketReminders)
);

export default router;