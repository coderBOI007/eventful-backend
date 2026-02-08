import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { RegisterDto, LoginDto } from "../types";

export class AuthController {
  /** POST /auth/register */
  static async register(req: Request, res: Response): Promise<void> {
    const dto = req.body as RegisterDto;

    // Basic input validation
    if (!dto.email || !dto.password || !dto.name || !dto.role) {
      res.status(400).json({ error: "Bad Request", message: "email, password, name, and role are required" });
      return;
    }
    if (!["creator", "eventee"].includes(dto.role)) {
      res.status(400).json({ error: "Bad Request", message: 'role must be "creator" or "eventee"' });
      return;
    }
    if (dto.password.length < 6) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 6 characters" });
      return;
    }

    const user = await AuthService.register(dto);
    res.status(201).json({ user });
  }

  /** POST /auth/login */
  static async login(req: Request, res: Response): Promise<void> {
    const dto = req.body as LoginDto;

    if (!dto.email || !dto.password) {
      res.status(400).json({ error: "Bad Request", message: "email and password are required" });
      return;
    }

    const { user, tokens } = await AuthService.login(dto);
    res.status(200).json({ user, tokens });
  }

  /** POST /auth/refresh */
  static async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: "Bad Request", message: "refreshToken is required" });
      return;
    }

    const result = await AuthService.refreshToken(refreshToken);
    res.status(200).json(result);
  }

  /** GET /auth/me */
  static async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await AuthService.getById(req.user.userId);
    res.status(200).json({ user });
  }
}