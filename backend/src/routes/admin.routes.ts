import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, authorize } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { auditEvents, updateAuctionStatus, updateUserRole, updateUserStatus } from "../controllers/admin.controller.js";

const router = Router();
router.use(authenticate, authorize(UserRole.ADMIN));
router.get("/audit-events", asyncHandler(auditEvents));
router.patch("/users/:id/status", asyncHandler(updateUserStatus));
router.patch("/users/:id/role", asyncHandler(updateUserRole));
router.patch("/auctions/:id/status", asyncHandler(updateAuctionStatus));
export default router;
