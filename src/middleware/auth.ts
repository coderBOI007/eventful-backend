import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { TokenPayload } from "../types";

// Extend Express Request so downstream handlers can access the user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded payload to `req.user`.
 *
 * Routes that require authentication should use this middleware.
 * Routes that are public (e.g. login) should NOT apply it.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Unauthorized", message: "Token expired. Please refresh." });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
    } else {
      res.status(500).json({ error: "Internal", message: "Token verification failed" });
    }
  }
}