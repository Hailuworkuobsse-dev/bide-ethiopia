import { AuctionStatus, AuctionType, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { recordAudit } from "./audit.service.js";

type ListFilters = { q?: string; category?: string; region?: string; status?: AuctionStatus; page: number; limit: number };
export async function listAuctions(filters: ListFilters) {
  const now = new Date();
  const where: Prisma.AuctionWhereInput = {
    ...(filters.status ? { status: filters.status } : { status: { in: [AuctionStatus.LIVE, AuctionStatus.SCHEDULED] } }),
    ...(filters.category ? { category: { equals: filters.category } } : {}),
    ...(filters.region ? { region: { contains: filters.region } } : {}),
    ...(filters.q ? { OR: [{ title: { contains: filters.q } }, { description: { contains: filters.q } }, { city: { contains: filters.q } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.auction.findMany({
      where, skip: (filters.page - 1) * filters.limit, take: filters.limit,
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, description: true, category: true, condition: true, region: true, city: true, imageUrls: true, type: true, status: true, currency: true, startingPrice: true, currentPrice: true, minimumIncrement: true, startsAt: true, endsAt: true, createdAt: true, seller: { select: { id: true, fullName: true } } },
    }),
    prisma.auction.count({ where }),
  ]);
  return { items: items.map((item) => ({ ...item, isLiveByTime: item.startsAt <= now && item.endsAt > now && item.status === AuctionStatus.LIVE })), pagination: { page: filters.page, limit: filters.limit, total, pages: Math.ceil(total / filters.limit) } };
}

export async function getAuction(id: string) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, fullName: true, createdAt: true } },
      bids: { orderBy: { createdAt: "desc" }, take: 30, select: { id: true, amount: true, status: true, createdAt: true, bidder: { select: { id: true, fullName: true } } } },
    },
  });
  if (!auction) throw new HttpError(404, "Auction not found", "AUCTION_NOT_FOUND");
  return auction;
}

export async function createAuction(sellerId: string, input: {
  title: string; description: string; category: string; condition?: string; region: string; city: string; imageUrls?: string[];
  type: "ASCENDING" | "DESCENDING"; startingPrice: number; minimumIncrement: number; reservePrice?: number; startsAt: Date; endsAt: Date;
}, context: { ip?: string; userAgent?: string }) {
  if (input.startsAt <= new Date()) throw new HttpError(400, "startsAt must be in the future", "INVALID_START_TIME");
  const auction = await prisma.auction.create({
    data: {
      sellerId, title: input.title, description: input.description, category: input.category,
      condition: input.condition, region: input.region, city: input.city,
      imageUrls: input.imageUrls as Prisma.InputJsonValue | undefined,
      type: input.type as AuctionType, status: AuctionStatus.SCHEDULED, currency: "ETB",
      startingPrice: new Prisma.Decimal(input.startingPrice), currentPrice: new Prisma.Decimal(input.startingPrice),
      minimumIncrement: new Prisma.Decimal(input.minimumIncrement),
      reservePrice: input.reservePrice === undefined ? undefined : new Prisma.Decimal(input.reservePrice),
      startsAt: input.startsAt, endsAt: input.endsAt,
    },
  });
  await recordAudit({ actorId: sellerId, action: "AUCTION_CREATED", entityType: "Auction", entityId: auction.id, ipAddress: context.ip, userAgent: context.userAgent });
  return auction;
}

export async function placeBid(auctionId: string, bidderId: string, amount: number, context: { ip?: string; userAgent?: string }) {
  const result = await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new HttpError(404, "Auction not found", "AUCTION_NOT_FOUND");
    const now = new Date();
    if (auction.sellerId === bidderId) throw new HttpError(403, "Sellers cannot bid on their own auction", "SELF_BIDDING_NOT_ALLOWED");
    if (auction.status !== AuctionStatus.LIVE || auction.startsAt > now || auction.endsAt <= now) {
      throw new HttpError(409, "Auction is not currently accepting bids", "AUCTION_NOT_LIVE");
    }
    const bidAmount = new Prisma.Decimal(amount);
    const minAllowed = auction.type === AuctionType.ASCENDING
      ? auction.currentPrice.add(auction.minimumIncrement)
      : auction.currentPrice.sub(auction.minimumIncrement);
    if (auction.type === AuctionType.ASCENDING && bidAmount.lt(minAllowed)) {
      throw new HttpError(400, `Bid must be at least ${minAllowed.toString()} ETB`, "BID_TOO_LOW");
    }
    if (auction.type === AuctionType.DESCENDING && (bidAmount.gte(auction.currentPrice) || bidAmount.lte(0))) {
      throw new HttpError(400, "For descending auctions, bid must be below the current price and above zero", "INVALID_DESCENDING_BID");
    }
    const bid = await tx.bid.create({ data: { auctionId, bidderId, amount: bidAmount, status: "WINNING" } });
    await tx.auction.update({ where: { id: auctionId }, data: { currentPrice: bidAmount } });
    return { bid, currentPrice: bidAmount };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await recordAudit({ actorId: bidderId, action: "BID_PLACED", entityType: "Bid", entityId: result.bid.id, ipAddress: context.ip, userAgent: context.userAgent, metadata: { auctionId } });
  return result;
}
