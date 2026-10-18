import type { Listing, AuctionStatus } from "./types";

export function statusOf(l: Listing, now: number): AuctionStatus {
  if (l.soldTo) return "ended";
  if (now < l.startsAt) return "scheduled";
  if (now >= l.endsAt) return "ended";
  return "live";
}

/** Current price: English = highest bid or opening; Dutch = opening minus hourly drops, never below floor. */
export function currentPrice(l: Listing, now: number): number {
  if (l.format === "dutch") {
    const hours = Math.max(0, Math.floor((Math.min(now, l.endsAt) - l.startsAt) / 3_600_000));
    const drop = (l.dutchDropPerHour ?? 0) * hours;
    return Math.max(l.dutchFloor ?? 0, l.openingPrice - drop);
  }
  const top = l.bids.reduce((m, b) => Math.max(m, b.amount), 0);
  return top || l.openingPrice;
}

export function minNextBid(l: Listing, now: number): number {
  if (l.format === "dutch") return currentPrice(l, now);
  return l.bids.length ? currentPrice(l, now) + l.minIncrement : l.openingPrice;
}

export type BidCheck = { ok: true } | { ok: false; reason: string };

/** Prototype client-side check. Production must repeat this inside a locked DB transaction. */
export function validateBid(
  l: Listing, amount: number, userId: string, now: number,
  opts: { tokens: number; depositHeld: boolean },
): BidCheck {
  const st = statusOf(l, now);
  if (st === "scheduled") return { ok: false, reason: "This auction has not started yet." };
  if (st === "ended") return { ok: false, reason: "This auction has ended." };
  if (l.sellerId === userId) return { ok: false, reason: "You cannot bid on your own listing." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Enter a valid amount in Birr." };
  if (opts.tokens < 1) return { ok: false, reason: "You need at least 1 bid token." };
  if (l.depositRequired && !opts.depositHeld) return { ok: false, reason: "A security deposit must be held before bidding." };
  const min = minNextBid(l, now);
  if (amount < min) return { ok: false, reason: `Minimum bid is ${min.toLocaleString()} ETB.` };
  return { ok: true };
}