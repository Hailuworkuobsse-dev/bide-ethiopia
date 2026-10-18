import type { Request, Response } from "express";
import { AuctionStatus } from "@prisma/client";
import { createAuctionSchema, listAuctionsSchema, bidSchema } from "../schemas/auction.schema.js";
import { createAuction, getAuction, listAuctions, placeBid } from "../services/auction.service.js";
import { HttpError } from "../utils/http-error.js";

export async function list(req: Request, res: Response) {
  const query = listAuctionsSchema.parse(req.query);
  const result = await listAuctions({ ...query, status: query.status as AuctionStatus | undefined });
  res.json({ data: result.items, pagination: result.pagination });
}
export async function detail(req: Request, res: Response) {
  res.json({ data: await getAuction(req.params.id!) });
}
export async function create(req: Request, res: Response) {
  const input = createAuctionSchema.parse(req.body);
  const result = await createAuction(req.auth!.userId, input, { ip: req.ip, userAgent: req.get("user-agent") });
  res.status(201).json({ data: result });
}
export async function bid(req: Request, res: Response) {
  const { amount } = bidSchema.parse(req.body);
  const result = await placeBid(req.params.id!, req.auth!.userId, amount, { ip: req.ip, userAgent: req.get("user-agent") });
  res.status(201).json({ data: result });
}
export async function myListings(req: Request, res: Response) {
  const result = await listAuctions({ page: 1, limit: 50, status: undefined });
  res.json({ data: result.items.filter((item) => item.seller.id === req.auth!.userId), pagination: result.pagination });
}
