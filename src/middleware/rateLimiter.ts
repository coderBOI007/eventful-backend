import rateLimit from "express-rate-limit";

export function createLimiter(max: number, windowMs: number, message?: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: "Too Many Requests",
        message: message || "You have exceeded the rate limit. Please try again later.",
      });
    },
  });
}

export const registerLimiter = createLimiter(5, 60_000, "Too many sign-up attempts. Please wait.");
export const loginLimiter = createLimiter(10, 60_000, "Too many login attempts. Please wait.");
export const ticketPurchaseLimiter = createLimiter(3, 60_000, "Ticket purchase rate limit exceeded.");
export const qrVerifyLimiter = createLimiter(1, 5_000, "QR verification rate limit exceeded.");
export const webhookLimiter = createLimiter(50, 60_000, "Webhook rate limit exceeded.");
export const globalLimiter = createLimiter(60, 60_000, "Global rate limit exceeded. Please slow down.");
