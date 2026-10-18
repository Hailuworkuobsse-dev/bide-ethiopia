import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/async-handler.js";
import { authenticate } from "../middleware/authenticate.js";
import { login, me, register } from "../controllers/auth.controller.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Too many authentication attempts. Try again later." } } });
router.post("/register", authLimiter, asyncHandler(register));
router.post("/login", authLimiter, asyncHandler(login));
router.get("/me", authenticate, asyncHandler(me));
export default router;
