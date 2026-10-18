import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { AuctionStatus, UserStatus, UserRole } from "@prisma/client";
import { HttpError } from "../utils/http-error.js";
import { recordAudit } from "../services/audit.service.js";

const statusSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]) });
const auctionStatusSchema = z.object({ status: z.enum(["LIVE", "CANCELLED", "ENDED"]) });
const userRoleSchema = z.object({ role: z.enum(["BUYER", "SELLER"]) });

export async function auditEvents(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const [data, total] = await prisma.$transaction([
    prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.auditEvent.count(),
  ]);
  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
export async function updateUserStatus(req: Request, res: Response) {
  const { status } = statusSchema.parse(req.body);
  const userId = req.params.id!;
  if (userId === req.auth!.userId) throw new HttpError(400, "Administrators cannot change their own status", "SELF_STATUS_CHANGE");
  const user = await prisma.user.update({ where: { id: userId }, data: { status: status as UserStatus }, select: { id: true, fullName: true, phone: true, role: true, status: true } });
  await recordAudit({ actorId: req.auth!.userId, action: "USER_STATUS_UPDATED", entityType: "User", entityId: userId, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { status } });
  res.json({ data: user });
}
export async function updateAuctionStatus(req: Request, res: Response) {
  const { status } = auctionStatusSchema.parse(req.body);
  const auction = await prisma.auction.findUnique({ where: { id: req.params.id! } });
  if (!auction) throw new HttpError(404, "Auction not found", "AUCTION_NOT_FOUND");
  if (status === "LIVE" && (auction.startsAt > new Date() || auction.endsAt <= new Date())) throw new HttpError(400, "Auction timing does not allow activation", "INVALID_AUCTION_TIMING");
  const updated = await prisma.auction.update({ where: { id: auction.id }, data: { status: status as AuctionStatus } });
  await recordAudit({ actorId: req.auth!.userId, action: "AUCTION_STATUS_UPDATED", entityType: "Auction", entityId: auction.id, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { status } });
  res.json({ data: updated });
}

export async function updateUserRole(req: Request, res: Response) {
  const { role } = userRoleSchema.parse(req.body);
  const userId = req.params.id!;
  if (userId === req.auth!.userId) throw new HttpError(400, "Administrators cannot change their own role", "SELF_ROLE_CHANGE");
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: role as UserRole },
    select: { id: true, fullName: true, phone: true, role: true, status: true },
  });
  await recordAudit({ actorId: req.auth!.userId, action: "USER_ROLE_UPDATED", entityType: "User", entityId: userId, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { role } });
  res.json({ data: user });
}
