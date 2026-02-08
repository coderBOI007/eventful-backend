import { Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config/env";
import { PaystackService } from "../services/PaystackService";
import { PaystackWebhookPayload } from "../types";

export class PaymentController {
  /**
   * POST /payments/paystack/webhook
   *
   * Paystack signs every webhook request with an HMAC-SHA512 of the raw body
   * using your secret key.  We verify this before processing anything.
   */
  static async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers["x-paystack-signature"] as string;

    if (!signature) {
      res.status(401).json({ error: "Unauthorized", message: "Missing X-Paystack-Signature header" });
      return;
    }

    // Compute expected signature from the raw body
    const expectedSignature = crypto
      .createHmac("sha512", config.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== expectedSignature) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid webhook signature" });
      return;
    }

    const payload = req.body as PaystackWebhookPayload;
    const result = await PaystackService.handleWebhook(payload);

    // Always respond 200 to Paystack so it doesn't retry
    res.status(200).json({ ok: true, handled: result.handled });
  }

  /** GET /payments/creator/:creatorId */
  static async getCreatorPayments(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { creatorId } = req.params;

    // Only the creator themselves can view their payments
    if (req.user.userId !== creatorId) {
      res.status(403).json({ error: "Forbidden", message: "You can only view your own payment records" });
      return;
    }

    const payments = await PaystackService.getCreatorPayments(creatorId);
    res.status(200).json({ payments });
  }
}