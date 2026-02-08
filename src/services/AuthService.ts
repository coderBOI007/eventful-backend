import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/env";
import { cache } from "../cache/redisClient";
import { AppError } from "../middleware/errorHandler";
import {
  RegisterDto,
  LoginDto,
  User,
  UserPublic,
  AuthTokens,
  TokenPayload,
} from "../types";

const usersDb: Map<string, User> = new Map();

export class AuthService {
  static async register(dto: RegisterDto): Promise<UserPublic> {
    const existing = await AuthService.findByEmail(dto.email);
    if (existing) {
      throw new AppError("A user with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user: User = {
      id: uuidv4(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      name: dto.name.trim(),
      role: dto.role,
      createdAt: new Date(),
    };

    usersDb.set(user.id, user);
    await cache.del("users:list");
    return AuthService.toPublic(user);
  }

  static async login(dto: LoginDto): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    const user = await AuthService.findByEmail(dto.email);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const tokens = AuthService.generateTokens(user);
    return { user: AuthService.toPublic(user), tokens };
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as TokenPayload;
      const user = usersDb.get(decoded.userId);
      if (!user) {
        throw new AppError("User not found", 401);
      }

      const payload: TokenPayload = {
        userId: user.id,
        role: user.role,
        email: user.email,
      };

      const accessToken = jwt.sign(
        payload,
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
      );

      return { accessToken };
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }

  static async getById(userId: string): Promise<UserPublic> {
    const user = await cache.getOrSet<UserPublic>(
      `user:${userId}`,
      async () => {
        const found = usersDb.get(userId);
        if (!found) throw new AppError("User not found", 404);
        return AuthService.toPublic(found);
      },
      900
    );
    return user;
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    const normalised = email.toLowerCase().trim();
    for (const user of usersDb.values()) {
      if (user.email === normalised) return user;
    }
    return undefined;
  }

  static generateTokens(user: User): AuthTokens {
    const payload: TokenPayload = {
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(
      payload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      payload,
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  private static toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
