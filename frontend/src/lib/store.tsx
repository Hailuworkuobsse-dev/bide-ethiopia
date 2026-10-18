import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import type { Listing, Notification, Deposit, TokenTx, AuditEvent, DepositStatus } from "./types";
import { seedListings, seedNotifications, seedDeposits, seedTokenTx, ME } from "./seed";
import { validateBid } from "./bidding";
import { uid, hash, etb } from "./format";
import { api, backendAuctionToListing, getStoredUser, getStoredToken, type BackendUser } from "./api";

export type Lang = "en" | "am" | "om" | "ti";

interface State {
  listings: Listing[];
  notifications: Notification[];
  deposits: Deposit[];
  tokenTx: TokenTx[];
  audit: AuditEvent[];
  watchlist: string[];
  lang: Lang;
  feePercent: number;
  categoriesDisabled: string[];
}

function initial(now: number): State {
  return {
    listings: seedListings(now),
    notifications: seedNotifications(now),
    deposits: seedDeposits(now),
    tokenTx: seedTokenTx(now),
    audit: [],
    watchlist: ["l-1", "l-2"],
    lang: "en",
    feePercent: 5,
    categoriesDisabled: [],
  };
}

const KEY = "bidethiopia-demo-v1";

function appendAudit(audit: AuditEvent[], actor: string, action: string, entity: string, detail: string): AuditEvent[] {
  const prevHash = audit[0]?.hash ?? "00000000";
  const at = Date.now();
  const ev: AuditEvent = { id: uid(), at, actor, action, entity, detail, prevHash, hash: hash(prevHash + at + actor + action + entity + detail) };
  return [ev, ...audit];
}

function useStoreValue() {
  const [s, setS] = useState<State>(() => initial(Date.now()));
  const [hydrated, setHydrated] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [authUser, setAuthUser] = useState<BackendUser | null>(() => getStoredUser());
  const ref = useRef(s);
  ref.current = s;

  // Hydrate local preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* ignore corrupt demo state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(s));
  }, [s, hydrated]);

  // Sync with live Backend API & MySQL Database
  const refreshAuctions = useCallback(async () => {
    try {
      await api.checkHealth();
      setBackendConnected(true);
      const res = await api.getAuctions({ limit: 50 });
      if (res?.data && res.data.length > 0) {
        const liveListings = res.data.map(backendAuctionToListing);
        setS((cur) => {
          // Merge backend listings with any local-only listings
          const backendIds = new Set(liveListings.map((l) => l.id));
          const localOnly = cur.listings.filter((l) => !backendIds.has(l.id) && l.id.startsWith("local-"));
          return {
            ...cur,
            listings: [...liveListings, ...localOnly],
          };
        });
      }
    } catch (err) {
      console.warn("Backend not reachable or still booting:", err);
      setBackendConnected(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    void refreshAuctions();
    const interval = setInterval(() => {
      void refreshAuctions();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshAuctions]);

  // Auto-login as default buyer if no token yet to ensure bids work smoothly out of the box
  useEffect(() => {
    if (!getStoredToken()) {
      api.login("+251912000111", "Password123!")
        .then((data) => setAuthUser(data.user))
        .catch(() => {
          // Fall back gracefully if backend is still starting
        });
    }
  }, []);

  const login = useCallback(async (phone: string, pass: string) => {
    const res = await api.login(phone, pass);
    setAuthUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data: { fullName: string; phone: string; password: string; email?: string }) => {
    const res = await api.register(data);
    setAuthUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setAuthUser(null);
  }, []);

  const tokens = s.tokenTx.reduce((a, t) => a + t.delta, 0);

  const placeBid = useCallback(
    (listingId: string, amount: number): { ok: boolean; reason?: string } => {
      const st = ref.current;
      const l = st.listings.find((x) => x.id === listingId);
      if (!l) return { ok: false, reason: "Listing not found." };
      const held = st.deposits.some((d) => d.listingId === listingId && d.status === "held");
      const bal = st.tokenTx.reduce((a, t) => a + t.delta, 0);

      const v = validateBid(l, amount, ME, Date.now(), { tokens: bal, depositHeld: held });
      if (!v.ok) return v;

      // If backend is connected, also dispatch to MySQL API asynchronously
      if (backendConnected && !listingId.startsWith("local-")) {
        api.placeBid(listingId, amount)
          .then(() => {
            void refreshAuctions();
          })
          .catch((err) => {
            console.error("Backend bid error:", err);
          });
      }

      const bid = {
        id: uid(),
        listingId,
        userId: authUser?.id ?? ME,
        userName: authUser?.fullName ?? "You",
        amount,
        at: Date.now(),
      };

      setS((cur) => ({
        ...cur,
        listings: cur.listings.map((x) =>
          x.id === listingId
            ? x.format === "dutch"
              ? { ...x, bids: [bid, ...x.bids], soldTo: authUser?.id ?? ME, endsAt: Date.now() }
              : { ...x, bids: [bid, ...x.bids] }
            : x,
        ),
        tokenTx: [{ id: uid(), label: `Bid on ${l.title.slice(0, 30)}`, delta: -1, at: Date.now(), demo: true }, ...cur.tokenTx],
        audit: appendAudit(cur.audit, authUser?.fullName ?? ME, l.format === "dutch" ? "dutch.accept" : "bid.place", listingId, etb(amount)),
      }));

      return { ok: true };
    },
    [backendConnected, authUser, refreshAuctions],
  );

  const requestDeposit = useCallback((listingId: string, amount: number) => {
    const id = uid();
    setS((st) => ({
      ...st,
      deposits: [{ id, listingId, amount, status: "pending", updatedAt: Date.now(), attempts: 1 }, ...st.deposits],
      audit: appendAudit(st.audit, ME, "deposit.pending", listingId, `${etb(amount)} (DEMO)`),
    }));
    setTimeout(() => {
      const failed = Math.random() < 0.15;
      setDepositStatus(id, failed ? "failed" : "held");
    }, 2500);
  }, []);

  const setDepositStatus = useCallback((id: string, status: DepositStatus) => {
    setS((st) => ({
      ...st,
      deposits: st.deposits.map((d) => (d.id === id ? { ...d, status, updatedAt: Date.now(), attempts: status === "pending" ? d.attempts + 1 : d.attempts } : d)),
      audit: appendAudit(st.audit, "demo-adapter", `deposit.${status}`, id, "simulated"),
    }));
  }, []);

  const retryDeposit = useCallback(
    (id: string) => {
      setDepositStatus(id, "pending");
      setTimeout(() => setDepositStatus(id, "held"), 2500);
    },
    [setDepositStatus],
  );

  const toggleWatch = useCallback((id: string) => {
    setS((st) => ({
      ...st,
      watchlist: st.watchlist.includes(id) ? st.watchlist.filter((w) => w !== id) : [...st.watchlist, id],
    }));
  }, []);

  const addListing = useCallback(
    (l: Listing) => {
      // Sync to MySQL Backend if connected
      if (backendConnected) {
        api.createAuction({
          title: l.title,
          description: l.description,
          category: l.category,
          condition: l.condition,
          region: "Addis Ababa",
          city: l.location,
          startingPrice: l.openingPrice,
          minimumIncrement: l.minIncrement,
          startsAt: new Date(l.startsAt),
          endsAt: new Date(l.endsAt),
          imageUrls: l.images,
          type: l.format === "dutch" ? "DESCENDING" : "ASCENDING",
        })
          .then((res) => {
            const mapped = backendAuctionToListing(res.data);
            setS((st) => ({
              ...st,
              listings: [mapped, ...st.listings.filter((item) => item.id !== l.id)],
            }));
          })
          .catch((err) => {
            console.warn("Backend createAuction error, saved locally:", err);
          });
      }

      setS((st) => ({
        ...st,
        listings: [l, ...st.listings],
        audit: appendAudit(st.audit, authUser?.fullName ?? ME, "listing.create", l.id, l.title),
      }));
    },
    [backendConnected, authUser],
  );

  const updateListing = useCallback((id: string, patch: Partial<Listing>, action = "listing.update") => {
    setS((st) => ({
      ...st,
      listings: st.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      audit: appendAudit(st.audit, ME, action, id, JSON.stringify(patch).slice(0, 60)),
    }));
  }, []);

  const markRead = useCallback((id?: string) => {
    setS((st) => ({
      ...st,
      notifications: st.notifications.map((n) => (!id || n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const buyTokens = useCallback((name: string, n: number, price: number) => {
    setS((st) => ({
      ...st,
      tokenTx: [{ id: uid(), label: `${name} pack — DEMO, no payment (${etb(price)})`, delta: n, at: Date.now(), demo: true }, ...st.tokenTx],
      audit: appendAudit(st.audit, ME, "tokens.demo_credit", name, `${n} tokens`),
    }));
  }, []);

  const setLang = useCallback((lang: Lang) => setS((st) => ({ ...st, lang })), []);
  const setFee = useCallback((feePercent: number) => {
    setS((st) => ({
      ...st,
      feePercent,
      audit: appendAudit(st.audit, ME, "config.fee", "success_fee", `${feePercent}%`),
    }));
  }, []);

  const toggleCategory = useCallback((c: string) => {
    setS((st) => ({
      ...st,
      categoriesDisabled: st.categoriesDisabled.includes(c) ? st.categoriesDisabled.filter((x) => x !== c) : [...st.categoriesDisabled, c],
      audit: appendAudit(st.audit, ME, "config.category", c, "toggled"),
    }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setS(initial(Date.now()));
    void refreshAuctions();
  }, [refreshAuctions]);

  return {
    ...s,
    hydrated,
    tokens,
    backendConnected,
    authUser,
    login,
    register,
    logout,
    refreshAuctions,
    placeBid,
    requestDeposit,
    retryDeposit,
    setDepositStatus,
    toggleWatch,
    addListing,
    updateListing,
    markRead,
    buyTokens,
    setLang,
    setFee,
    toggleCategory,
    reset,
  };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function useMemoNow() {
  const n = useNow();
  return useMemo(() => n ?? Date.now(), [n]);
}