import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types";

/**
 * Factory that returns an Express middleware which enforces that the
 * authenticated user (`req.user`) holds one of the specified roles.
 *
 * Usage:
 *   router.post("/events", authMiddleware, roleGuard("creator"), createEvent);
 */
export function roleGuard(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}