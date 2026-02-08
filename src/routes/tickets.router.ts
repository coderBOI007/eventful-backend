import { Router } from "express";
import { TicketController } from "../controllers/TicketController";
import { authMiddleware } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import { ticketPurchaseLimiter, qrVerifyLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /events/{eventId}/tickets:
 *   post:
 *     summary: Purchase a ticket — initiates Paystack payment
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Payment session created. Redirect user to authorizationUrl.
 *       409:
 *         description: Event sold out
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  "/:eventId/tickets",
  authMiddleware,
  roleGuard("eventee"),
  ticketPurchaseLimiter,
  asyncHandler(TicketController.purchase)
);

/**
 * @swagger
 * /events/{eventId}/tickets/verify/{qrToken}:
 *   get:
 *     summary: Verify a QR code at the event door
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: qrToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result { valid, ticket }
 *       400:
 *         description: Invalid or tampered QR token
 *       429:
 *         description: Rate limit exceeded (1 scan per 5 seconds)
 */
router.get(
  "/:eventId/tickets/verify/:qrToken",
  qrVerifyLimiter,
  asyncHandler(TicketController.verifyQR)
);

/**
 * @swagger
 * /tickets/me:
 *   get:
 *     summary: Get all tickets for the authenticated eventee
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of tickets
 */
router.get("/me", authMiddleware, roleGuard("eventee"), asyncHandler(TicketController.myTickets));

export default router;