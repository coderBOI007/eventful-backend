import mongoose from "mongoose";
import { config } from "./env";

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URL);
    console.log("[MongoDB] Connected successfully");
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    process.exit(1);
  }
}
