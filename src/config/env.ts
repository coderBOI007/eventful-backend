import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface AppConfig {
  PORT: number;
  MONGODB_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;
  PAYSTACK_WEBHOOK_HASH: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  APP_BASE_URL: string;
  QR_HMAC_SECRET: string;
}

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: AppConfig = {
  PORT: parseInt(getEnv("PORT", "3000"), 10),
  MONGODB_URL: getEnv("MONGODB_URL", "mongodb://localhost:27017/eventful"),
  JWT_SECRET: getEnv("JWT_SECRET", "dev_jwt_secret_change_in_production"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET", "dev_refresh_secret_change_in_production"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
  PAYSTACK_SECRET_KEY: getEnv("PAYSTACK_SECRET_KEY", "sk_test_placeholder"),
  PAYSTACK_PUBLIC_KEY: getEnv("PAYSTACK_PUBLIC_KEY", "pk_test_placeholder"),
  PAYSTACK_WEBHOOK_HASH: getEnv("PAYSTACK_WEBHOOK_HASH", "dev_webhook_hash"),
  SMTP_HOST: getEnv("SMTP_HOST", "smtp.gmail.com"),
  SMTP_PORT: parseInt(getEnv("SMTP_PORT", "587"), 10),
  SMTP_USER: getEnv("SMTP_USER", ""),
  SMTP_PASS: getEnv("SMTP_PASS", ""),
  APP_BASE_URL: getEnv("APP_BASE_URL", "http://localhost:3000"),
  QR_HMAC_SECRET: getEnv("QR_HMAC_SECRET", "dev_qr_hmac_secret_change_in_prod"),
};
