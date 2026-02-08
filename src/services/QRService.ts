import crypto from "crypto";
import QRCode from "qrcode";
import { config } from "../config/env";
import { AppError } from "../middleware/errorHandler";

/**
 * The payload embedded inside every QR token (before signing).
 */
interface QRPayload {
  ticketId: string;
  eventId: string;
  issuedAt: number; // Unix timestamp (seconds)
}

export class QRService {
  /**
   * Creates a signed, base64url-encoded token that encodes the ticket and
   * event IDs.  The token is then rendered as a QR code PNG (data URI).
   *
   * @returns  { token, dataUri }
   */
  static async generate(ticketId: string, eventId: string): Promise<{ token: string; dataUri: string }> {
    const payload: QRPayload = {
      ticketId,
      eventId,
      issuedAt: Math.floor(Date.now() / 1000),
    };

    const token = QRService.sign(payload);

    // Render as a PNG data URI (can be embedded in email or served directly)
    const dataUri = await QRCode.toDataURL(token, {
      errorCorrectionLevel: "H",
      width: 300,
      margin: 2,
    });

    return { token, dataUri };
  }

  /**
   * Verifies a QR token.
   * Returns the decoded payload on success; throws AppError on failure.
   *
   * NOTE: This method is deliberately lightweight — it only validates the
   * cryptographic signature and returns the IDs.  The caller (TicketService)
   * is responsible for checking DB state (e.g. whether the ticket has already
   * been scanned).
   */
  static verify(token: string): QRPayload {
    try {
      const [encodedPayload, signature] = token.split(".");
      if (!encodedPayload || !signature) {
        throw new Error("Malformed token");
      }

      // Re-derive the expected signature
      const expectedSignature = QRService.hmac(encodedPayload);
      if (!crypto.timingSafeEqual(Buffer.from(signature, "base64url"), Buffer.from(expectedSignature, "base64url"))) {
        throw new Error("Signature mismatch");
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as QRPayload;
      return payload;
    } catch {
      throw new AppError("Invalid or tampered QR token", 400);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Encode the payload and append an HMAC-SHA256 signature. */
  private static sign(payload: QRPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = QRService.hmac(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  /** HMAC-SHA256 using the app's QR secret. */
  private static hmac(data: string): string {
    return crypto.createHmac("sha256", config.QR_HMAC_SECRET).update(data).digest("base64url");
  }
}