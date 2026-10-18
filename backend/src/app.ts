import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import auctionRoutes from "./routes/auction.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { prisma } from "./config/prisma.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: false, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"] }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", database: "unavailable", timestamp: new Date().toISOString() });
  }
});
app.use(env.API_PREFIX + "/auth", authRoutes);
app.use(env.API_PREFIX + "/auctions", auctionRoutes);
app.use(env.API_PREFIX + "/admin", adminRoutes);
app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }));
app.use(errorHandler);
