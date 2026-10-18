import { describe, it, expect } from "vitest";
import { validateBid, currentPrice } from "./bidding";
import type { Listing } from "./types";

const now = 1_000_000_000_000;
const base: Listing = {
  id: "x", title: "t", category: "Electronics", description: "", condition: "New", specs: {},
  location: "Addis Ababa", images: [], format: "english", openingPrice: 1000, minIncrement: 100,
  startsAt: now - 1000, endsAt: now + 100000, delivery: "pickup", terms: "", sellerId: "s",
  bids: [{ id: "b", listingId: "x", userId: "u2", userName: "A", amount: 1500, at: now }], moderation: "approved",
};
const ok = { tokens: 5, depositHeld: true };

describe("bid rules", () => {
  it("rejects bids below current + increment", () => {
    expect(validateBid(base, 1599, "u1", now, ok).ok).toBe(false);
    expect(validateBid(base, 1600, "u1", now, ok).ok).toBe(true);
  });
  it("rejects bids after the auction ended", () => {
    expect(validateBid({ ...base, endsAt: now - 1 }, 5000, "u1", now, ok).ok).toBe(false);
  });
  it("rejects seller bidding on own listing", () => {
    expect(validateBid(base, 5000, "s", now, ok).ok).toBe(false);
  });
  it("requires a held deposit when the listing needs one", () => {
    expect(validateBid({ ...base, depositRequired: 500 }, 5000, "u1", now, { tokens: 5, depositHeld: false }).ok).toBe(false);
  });
  it("dutch price drops hourly but not below floor", () => {
    const d = { ...base, format: "dutch" as const, bids: [], openingPrice: 10000, dutchDropPerHour: 1000, dutchFloor: 7000, startsAt: now - 5 * 3_600_000 };
    expect(currentPrice(d, now)).toBe(7000);
  });
});