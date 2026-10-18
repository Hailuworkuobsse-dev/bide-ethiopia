import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import type { Listing, Notification, Deposit, TokenTx, AuditEvent, DepositStatus } from "./types";
import { seedListings, seedNotifications, seedDeposits, seedTokenTx, ME } from "./seed";
import { validateBid } from "./bidding";
import { uid, hash, etb } from "./format";

export type Lang = "en" | "am" | "om" | "ti";

interface State {
  listings: Listing[]; notifications: Notification[]; deposits: Deposit[];
  tokenTx: TokenTx[]; audit: AuditEvent[]; watchlist: string[]; lang: Lang;
  feePercent: number; categoriesDisabled: string[];
}

function initial(now: number): State {
  return {
    listings: seedListings(now), notifications: seedNotifications(now), deposits: seedDeposits(now),
    tokenTx: seedTokenTx(now), audit: [], watchlist: ["l-1", "l-2"], lang: "en", feePercent: 5, categoriesDisabled: [],
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
  const ref = useRef(s);
  ref.current = s;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch { /* ignore corrupt demo state */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, hydrated]);

  const tokens = s.tokenTx.reduce((a, t) => a + t.delta, 0);

  const placeBid = useCallback((listingId: string, amount: number): { ok: boolean; reason?: string } => {
    const st = ref.current;
    const l = st.listings.find((x) => x.id === listingId);
    if (!l) return { ok: false, reason: "Listing not found." };
    const held = st.deposits.some((d) => d.listingId === listingId && d.status === "held");
    const bal = st.tokenTx.reduce((a, t) => a + t.delta, 0);
    const v = validateBid(l, amount, ME, Date.now(), { tokens: bal, depositHeld: held });
    if (!v.ok) return v;
    const bid = { id: uid(), listingId, userId: ME, userName: "You", amount, at: Date.now() };
    setS((cur) => ({
      ...cur,
      listings: cur.listings.map((x) => (x.id === listingId ? (x.format === "dutch" ? { ...x, bids: [bid, ...x.bids], soldTo: ME, endsAt: Date.now() } : { ...x, bids: [bid, ...x.bids] }) : x)),
      tokenTx: [{ id: uid(), label: `Bid on ${l.title.slice(0, 30)}`, delta: -1, at: Date.now(), demo: true }, ...cur.tokenTx],
      audit: appendAudit(cur.audit, ME, l.format === "dutch" ? "dutch.accept" : "bid.place", listingId, etb(amount)),
    }));
    return { ok: true };
  }, []);

  const requestDeposit = useCallback((listingId: string, amount: number) => {
    const id = uid();
    setS((st) => ({
      ...st,
      deposits: [{ id, listingId, amount, status: "pending", updatedAt: Date.now(), attempts: 1 }, ...st.deposits],
      audit: appendAudit(st.audit, ME, "deposit.pending", listingId, `${etb(amount)} (DEMO)`),
    }));
    // Simulated provider confirmation with possible failure — no real money moves.
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

  const retryDeposit = useCallback((id: string) => {
    setDepositStatus(id, "pending");
    setTimeout(() => setDepositStatus(id, "held"), 2500);
  }, [setDepositStatus]);

  const toggleWatch = useCallback((id: string) => setS((st) => ({ ...st, watchlist: st.watchlist.includes(id) ? st.watchlist.filter((w) => w !== id) : [...st.watchlist, id] })), []);
  const addListing = useCallback((l: Listing) => setS((st) => ({ ...st, listings: [l, ...st.listings], audit: appendAudit(st.audit, ME, "listing.create", l.id, l.title) })), []);
  const updateListing = useCallback((id: string, patch: Partial<Listing>, action = "listing.update") => setS((st) => ({ ...st, listings: st.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)), audit: appendAudit(st.audit, ME, action, id, JSON.stringify(patch).slice(0, 60)) })), []);
  const markRead = useCallback((id?: string) => setS((st) => ({ ...st, notifications: st.notifications.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) })), []);
  const buyTokens = useCallback((name: string, n: number, price: number) => setS((st) => ({ ...st, tokenTx: [{ id: uid(), label: `${name} pack — DEMO, no payment (${etb(price)})`, delta: n, at: Date.now(), demo: true }, ...st.tokenTx], audit: appendAudit(st.audit, ME, "tokens.demo_credit", name, `${n} tokens`) })), []);
  const setLang = useCallback((lang: Lang) => setS((st) => ({ ...st, lang })), []);
  const setFee = useCallback((feePercent: number) => setS((st) => ({ ...st, feePercent, audit: appendAudit(st.audit, ME, "config.fee", "success_fee", `${feePercent}%`) })), []);
  const toggleCategory = useCallback((c: string) => setS((st) => ({ ...st, categoriesDisabled: st.categoriesDisabled.includes(c) ? st.categoriesDisabled.filter((x) => x !== c) : [...st.categoriesDisabled, c], audit: appendAudit(st.audit, ME, "config.category", c, "toggled") })), []);
  const reset = useCallback(() => { localStorage.removeItem(KEY); setS(initial(Date.now())); }, []);

  return { ...s, hydrated, tokens, placeBid, requestDeposit, retryDeposit, setDepositStatus, toggleWatch, addListing, updateListing, markRead, buyTokens, setLang, setFee, toggleCategory, reset };
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
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(t); }, [interval]);
  return now;
}

export function useMemoNow() { const n = useNow(); return useMemo(() => n ?? Date.now(), [n]); }