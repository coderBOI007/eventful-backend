import { Router } from "express";
import { PaymentController } from "../controllers/PaymentController";
import { authMiddleware } from "../middleware/auth";
import { roleGuard } from "../middleware/roleGuard";
import { webhookLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * @swagger
 * /payments/paystack/webhook:
 *   post:
 *     summary: Paystack webhook endpoint — confirms or fails payments
 *     tags: [Payments]
 *     description: |
 *       Called automatically by Paystack after a transaction completes.
 *       Validates the X-Paystack-Signature header before processing.
 *       On success: ticket is confirmed and a QR code is generated.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *       401:
 *         description: Invalid webhook signature
 *       429:
 *         description: Rate limit exceeded
 */
router.post("/paystack/webhook", webhookLimiter, asyncHandler(PaymentController.webhook));

/**
 * @swagger
 * /payments/creator/{creatorId}:
 *   get:
 *     summary: Get all payment records for a creator's events
 *     tags: [Payments]
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
 *         description: Array of payment records
 *       403:
 *         description: Not authorized to view these payments
 */
router.get(
  "/creator/:creatorId",
  authMiddleware,
  roleGuard("creator"),
  asyncHandler(PaymentController.getCreatorPayments)
);

export default router;