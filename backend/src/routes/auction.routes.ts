import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, authorize } from "../middleware/authenticate.js";
import { auditRequest } from "../middleware/audit-request.js";\nimport { requireActiveAccount } from "../middleware/require-active-account.js";
import { asyncHandler } from "../utils/async-handler.js";
import { bid, create, detail, list, myListings } from "../controllers/auction.controller.js";

const router = Router();
router.get("/", asyncHandler(list));
router.get("/mine", authenticate, authorize(UserRole.SELLER, UserRole.ADMIN), asyncHandler(myListings));
router.get("/:id", asyncHandler(detail));
router.post("/", authenticate, requireActiveAccount, authorize(UserRole.SELLER, UserRole.ADMIN), auditRequest("AUCTION_CREATE_REQUEST", "Auction"), asyncHandler(create));
router.post("/:id/bids", authenticate, requireActiveAccount, auditRequest("BID_REQUEST", "Bid"), asyncHandler(bid));
export default router;
