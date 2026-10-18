import type { Category, AuctionFormat, Listing, Bid as FrontendBid } from "./types";
import { CATEGORY_IMAGE } from "./seed";

const envObj = import.meta.env as Record<string, string | undefined>;
const API_BASE_URL = envObj["VITE_API_URL"] ?? "http://localhost:3410/api/v1";
const SERVER_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export interface BackendUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  preferredLanguage?: string;
  createdAt: string;
}

export interface BackendBid {
  id: string;
  amount: number | string;
  status: "ACCEPTED" | "OUTBID" | "WINNING" | "REJECTED";
  createdAt: string;
  bidder?: {
    id: string;
    fullName: string;
  };
}

export interface BackendAuction {
  id: string;
  title: string;
  description: string;
  category: string;
  condition?: string | null;
  region: string;
  city: string;
  imageUrls?: string[] | null;
  type: "ASCENDING" | "DESCENDING";
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  currency: string;
  startingPrice: number | string;
  currentPrice: number | string;
  minimumIncrement: number | string;
  reservePrice?: number | string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  isLiveByTime?: boolean;
  seller?: {
    id: string;
    fullName: string;
    createdAt?: string;
  };
  bids?: BackendBid[];
}

export interface BackendAuditEvent {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  actor?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
}

const TOKEN_KEY = "bidethiopia_auth_token";
const USER_KEY = "bidethiopia_auth_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export function getStoredUser(): BackendUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: BackendUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getStoredToken();
  const headers = new Headers(options.headers ?? {});
  
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Health
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${SERVER_ROOT}/health`);
    if (!res.ok) throw new Error("Backend server unhealthy");
    return res.json();
  },

  // Auth
  async login(phone: string, password: string): Promise<{ user: BackendUser; accessToken: string }> {
    const res = await request<{ data: { user: BackendUser; accessToken: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    setStoredToken(res.data.accessToken);
    setStoredUser(res.data.user);
    return res.data;
  },

  async register(data: {
    fullName: string;
    phone: string;
    password: string;
    email?: string;
    preferredLanguage?: string;
    role?: "BUYER" | "SELLER";
  }): Promise<{ user: BackendUser; emailSent: boolean }> {
    const res = await request<{ data: { user: BackendUser; emailSent: boolean } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Do not store the token or user: registration must return to the sign-in flow.
    return res.data;
  },

  async verifyEmail(token: string): Promise<{ verified: boolean }> {\n    const res = await request<{ data: { verified: boolean } }>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });\n    return res.data;\n  },\n\n  async me(): Promise<{ userId: string; role: string }> {
    const res = await request<{ data: { userId: string; role: string } }>("/auth/me");
    return res.data;
  },

  logout() {
    setStoredToken(null);
    setStoredUser(null);
  },

  // Auctions
  async getAuctions(params: {
    q?: string;
    category?: string;
    region?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: BackendAuction[]; pagination: { total: number; page: number; limit: number } }> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    if (params.region) query.set("region", params.region);
    if (params.status && params.status !== "all") {
      const upper = params.status.toUpperCase();
      if (["LIVE", "SCHEDULED", "ENDED"].includes(upper)) query.set("status", upper);
    }
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const path = `/auctions${query.toString() ? `?${query.toString()}` : ""}`;
    return request<{ data: BackendAuction[]; pagination: { total: number; page: number; limit: number } }>(path);
  },

  async getAuction(id: string): Promise<{ data: BackendAuction }> {
    return request<{ data: BackendAuction }>(`/auctions/${id}`);
  },

  async placeBid(auctionId: string, amount: number): Promise<{ data: { bid: BackendBid; currentPrice: number } }> {
    return request<{ data: { bid: BackendBid; currentPrice: number } }>(`/auctions/${auctionId}/bids`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },

  async createAuction(payload: {
    title: string;
    description: string;
    category: string;
    condition?: string;
    region: string;
    city: string;
    imageUrls?: string[];
    type?: "ASCENDING" | "DESCENDING";
    startingPrice: number;
    minimumIncrement: number;
    reservePrice?: number;
    startsAt: Date | string;
    endsAt: Date | string;
  }): Promise<{ data: BackendAuction }> {
    return request<{ data: BackendAuction }>("/auctions", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        type: payload.type ?? "ASCENDING",
        startsAt: new Date(payload.startsAt).toISOString(),
        endsAt: new Date(payload.endsAt).toISOString(),
      }),
    });
  },

  async getMyListings(): Promise<{ data: BackendAuction[] }> {
    return request<{ data: BackendAuction[] }>("/auctions/mine");
  },

  // Admin
  async getAuditEvents(): Promise<{ data: BackendAuditEvent[] }> {
    return request<{ data: BackendAuditEvent[] }>("/admin/audit-events");
  },

  async updateAuctionStatus(id: string, status: string): Promise<{ data: BackendAuction }> {
    return request<{ data: BackendAuction }>(`/admin/auctions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

/**
 * Maps a BackendAuction record from MySQL into the frontend's Listing structure.
 */
export function backendAuctionToListing(ba: BackendAuction): Listing {
  const cat = (ba.category as Category) in CATEGORY_IMAGE ? (ba.category as Category) : "Electronics";
  const defaultImg = CATEGORY_IMAGE[cat] || CATEGORY_IMAGE.Electronics;
  const image = Array.isArray(ba.imageUrls) && ba.imageUrls[0] ? ba.imageUrls[0] : defaultImg;

  const currentP = Number(ba.currentPrice) || Number(ba.startingPrice) || 0;
  const openingP = Number(ba.startingPrice) || currentP;
  const minInc = Number(ba.minimumIncrement) || Math.max(50, Math.round(openingP * 0.02 / 50) * 50);

  const bids: FrontendBid[] = (ba.bids || []).map((b) => ({
    id: b.id,
    listingId: ba.id,
    userId: b.bidder?.id ?? "unknown",
    userName: b.bidder?.fullName ?? "Bidder",
    amount: Number(b.amount),
    at: new Date(b.createdAt).getTime(),
  }));

  const format: AuctionFormat = ba.type === "DESCENDING" ? "dutch" : "english";

  return {
    id: ba.id,
    title: ba.title,
    category: cat,
    description: ba.description,
    condition: (ba.condition as "New" | "Like new" | "Used - good" | "Used - fair") ?? "Used - good",
    specs: {
      Region: ba.region,
      City: ba.city,
    },
    location: ba.city ? `${ba.city}, ${ba.region}` : ba.region,
    images: [image],
    format,
    openingPrice: openingP,
    minIncrement: minInc,
    startsAt: new Date(ba.startsAt).getTime(),
    endsAt: new Date(ba.endsAt).getTime(),
    delivery: "both",
    terms: "Winner pays within 48 hours. Escrow inspection available.",
    sellerId: ba.seller?.id ?? "seller",
    bids,
    moderation: ba.status === "CANCELLED" ? "flagged" : "approved",
  };
}
