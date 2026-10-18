import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, RefreshCw, Database, Server, CheckCircle2, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageTitle } from "@/components/shell";
import { CATEGORIES } from "@/lib/types";
import { USERS } from "@/lib/seed";
import { etb, fmtDate } from "@/lib/format";
import { currentPrice } from "@/lib/bidding";
import { api, type BackendAuditEvent } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin command center — BidEthiopia" },
      { name: "description", content: "Moderation, fees, payments reconciliation and audit log." },
      { property: "og:title", content: "BidEthiopia admin" },
      { property: "og:description", content: "Operations dashboard." },
    ],
  }),
  component: Admin,
});

export function Admin() {
  const s = useStore();
  const [dbAuditEvents, setDbAuditEvents] = useState<BackendAuditEvent[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>("checking");

  const checkHealth = async () => {
    try {
      const h = await api.checkHealth();
      setHealthStatus(`OK (${h.status})`);
    } catch {
      setHealthStatus("Unreachable");
    }
  };

  const fetchDbAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await api.getAuditEvents();
      if (res?.data) {
        setDbAuditEvents(res.data);
      }
    } catch {
      // Non-admins or unauthenticated cannot fetch admin audit events
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    void checkHealth();
    void fetchDbAudit();
  }, [s.authUser]);

  const queue = s.listings.filter((l) => l.moderation !== "approved");
  const gmv = s.listings.filter((l) => l.soldTo).reduce((a, l) => a + currentPrice(l, l.endsAt), 0);
  const kpis = [
    ["Total Listings", s.listings.length],
    ["Total Bids", s.listings.reduce((a, l) => a + l.bids.length, 0)],
    ["Total GMV (Birr)", etb(gmv)],
    ["Moderation Queue", queue.length],
  ];

  const switchToAdmin = async () => {
    try {
      await s.login("+251911234567", "Password123!");
      toast.success("Switched to Abebe Admin (ADMIN role)");
      void fetchDbAudit();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to switch to admin");
    }
  };

  const isAdmin = s.authUser?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle
          title="Admin Command Center"
          sub="Live management connected to Node.js / Express backend and MySQL (Port 3307)."
          icon={Shield}
        />
        {!isAdmin && (
          <button onClick={switchToAdmin} className="btn-gold min-h-10 text-sm">
            Log in as Abebe Admin
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Moderation Queue */}
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Auction Moderation & Review</h2>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue empty. All live auctions are approved.</p>
          ) : (
            queue.map((l) => (
              <div key={l.id} className="flex items-center gap-2 border-b py-2 text-sm">
                <span className={`badge ${l.moderation === "flagged" ? "bg-destructive text-destructive-foreground" : "bg-accent"}`}>
                  {l.moderation}
                </span>
                <span className="flex-1 font-medium truncate">{l.title}</span>
                <button
                  onClick={() => s.updateListing(l.id, { moderation: "approved" }, "moderation.approve")}
                  className="btn-primary min-h-9 px-3 text-xs"
                >
                  Approve
                </button>
                <button
                  onClick={() => s.updateListing(l.id, { endsAt: Date.now(), moderation: "flagged" }, "moderation.reject")}
                  className="btn-outline min-h-9 px-3 text-xs"
                >
                  Reject
                </button>
              </div>
            ))
          )}
        </section>

        {/* User Verification Queue */}
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Registered User Directory</h2>
          {USERS.map((u) => (
            <div key={u.id} className="flex justify-between items-center border-b py-2 text-sm">
              <div>
                <span className="font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{u.phone}</span>
              </div>
              <span className={`badge ${u.verification === "id_verified" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted"}`}>
                {u.verification}
              </span>
            </div>
          ))}
        </section>

        {/* Fee & Category Settings */}
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Fees & Categories</h2>
          <label className="label">Platform Success Fee: {s.feePercent}%</label>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={s.feePercent}
            onChange={(e) => s.setFee(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex flex-wrap gap-2 pt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => s.toggleCategory(c)}
                className={`chip ${s.categoriesDisabled.includes(c) ? "" : "chip-active"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* System Health */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">System & Database Architecture</h2>
            <button onClick={checkHealth} className="btn-ghost size-8 p-0" title="Check Health">
              <RefreshCw className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Server className="size-3.5" /> Backend REST API
              </p>
              <p className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3.5" /> Port 3410 ({healthStatus})
              </p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="size-3.5" /> MySQL Database
              </p>
              <p className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3.5" /> Port 3307 (bide_ethiopia)
              </p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-xs text-muted-foreground">ORM Engine</p>
              <p className="font-semibold">Prisma Client v6.19.3</p>
            </div>
            <div className="rounded-lg bg-muted p-2.5">
              <p className="text-xs text-muted-foreground">Frontend App</p>
              <p className="font-semibold text-emerald-600">Port 3411 (Vite + TanStack)</p>
            </div>
          </div>
        </section>

        {/* MySQL Audit Trail */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Database Audit Log (MySQL AuditEvent Table)</h2>
            <button
              onClick={fetchDbAudit}
              disabled={loadingAudit}
              className="btn-outline min-h-8 px-2.5 text-xs flex items-center gap-1"
            >
              <RefreshCw className={`size-3.5 ${loadingAudit ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {!isAdmin ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Log in as <b>Abebe Admin</b> to view full MySQL audit events from the protected backend endpoint.</span>
            </div>
          ) : dbAuditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No backend audit events recorded yet.</p>
          ) : (
            <ul className="max-h-60 overflow-auto font-mono text-xs divide-y">
              {dbAuditEvents.map((a) => (
                <li key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-primary">{a.action}</span>
                    <span className="text-muted-foreground ml-2">by {a.actor?.fullName ?? a.actorId ?? "System"}</span>
                    <span className="text-xs text-muted-foreground ml-2">({a.entityType}: {a.entityId ?? "–"})</span>
                  </div>
                  <span className="text-muted-foreground text-[10px]">{fmtDate(new Date(a.createdAt).getTime())}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}