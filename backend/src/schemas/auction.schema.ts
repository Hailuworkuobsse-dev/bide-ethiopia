import { z } from "zod";

export const createAuctionSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(10).max(10000),
  category: z.string().trim().min(2).max(60),
  condition: z.string().trim().max(40).optional(),
  region: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  imageUrls: z.array(z.string().url().max(2048)).max(12).optional(),
  type: z.enum(["ASCENDING", "DESCENDING"]).default("ASCENDING"),
  startingPrice: z.coerce.number().positive().max(999999999999),
  minimumIncrement: z.coerce.number().positive().max(999999999999).default(1),
  reservePrice: z.coerce.number().positive().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((data) => data.endsAt > data.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] })
.refine((data) => !data.reservePrice || data.reservePrice >= data.startingPrice, { message: "reservePrice cannot be below startingPrice", path: ["reservePrice"] });

export const listAuctionsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  region: z.string().trim().max(80).optional(),
  status: z.enum(["SCHEDULED", "LIVE", "ENDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const bidSchema = z.object({ amount: z.coerce.number().positive().max(999999999999) });
