export type Category =
  | "Electronics" | "Vehicles" | "Agriculture" | "Livestock"
  | "Coffee & Grain" | "Home & Business" | "Property" | "Wholesale";

export const CATEGORIES: Category[] = [
  "Electronics", "Vehicles", "Agriculture", "Livestock",
  "Coffee & Grain", "Home & Business", "Property", "Wholesale",
];

export const LOCATIONS = ["Addis Ababa", "Adama", "Bahir Dar", "Hawassa", "Mekelle", "Dire Dawa", "Jimma", "Gondar"];

/** english = ascending bids; dutch = price descends over time until someone accepts. */
export type AuctionFormat = "english" | "dutch";
export type AuctionStatus = "scheduled" | "live" | "ended";

export interface Bid { id: string; listingId: string; userId: string; userName: string; amount: number; at: number }

export interface Listing {
  id: string;
  title: string;
  category: Category;
  description: string;
  condition: "New" | "Like new" | "Used - good" | "Used - fair";
  specs: Record<string, string>;
  quantity?: number;
  unit?: string;
  location: string;
  images: string[];
  format: AuctionFormat;
  openingPrice: number;
  minIncrement: number;
  /** Dutch only */
  dutchFloor?: number;
  dutchDropPerHour?: number;
  startsAt: number;
  endsAt: number;
  depositRequired?: number;
  delivery: "pickup" | "delivery" | "both";
  terms: string;
  sellerId: string;
  bids: Bid[];
  soldTo?: string;
  moderation: "approved" | "pending" | "flagged";
}

export interface User {
  id: string; name: string; phone: string; city: string;
  verification: "unverified" | "phone" | "id_verified";
  rating: number; sales: number; joined: string; role: "user" | "admin";
}

export interface Notification { id: string; kind: "outbid" | "ending" | "won" | "sold" | "system"; title: string; body: string; at: number; read: boolean; listingId?: string }

export type DepositStatus = "pending" | "held" | "released" | "applied_to_winner" | "failed";
export interface Deposit { id: string; listingId: string; amount: number; status: DepositStatus; updatedAt: number; attempts: number }

export interface TokenTx { id: string; label: string; delta: number; at: number; demo: true }

export interface AuditEvent { id: string; at: number; actor: string; action: string; entity: string; detail: string; prevHash: string; hash: string }