import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageTitle } from "@/components/shell";
import { CATEGORIES } from "@/lib/types";
import { USERS } from "@/lib/seed";
import { etb, fmtDate } from "@/lib/format";
import { currentPrice } from "@/lib/bidding";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin command center — BidEthiopia" }, { name: "description", content: "Moderation, fees, payments reconciliation and audit log." },
    { property: "og:title", content: "BidEthiopia admin" }, { property: "og:description", content: "Operations dashboard (demo)." },
  ] }),
  component: Admin,
});

function Admin() {
  const s = useStore();
  const queue = s.listings.filter((l) => l.moderation !== "approved");
  const gmv = s.listings.filter((l) => l.soldTo).reduce((a, l) => a + currentPrice(l, l.endsAt), 0);
  const kpis = [["Listings", s.listings.length], ["Bids", s.listings.reduce((a, l) => a + l.bids.length, 0)], ["Sold GMV (demo)", etb(gmv)], ["Moderation queue", queue.length]];
  return (
    <div className="space-y-6">
      <PageTitle title="Admin command center" sub="Prototype: role checks are client-side only. Production requires server-side roles." icon={Shield} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{kpis.map(([k, v]) => <div key={k} className="card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-bold">{v}</p></div>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-2 font-semibold">Auction moderation & disputes</h2>
          {queue.length === 0 ? <p className="text-sm text-muted-foreground">Queue empty.</p> : queue.map((l) => (
            <div key={l.id} className="flex items-center gap-2 border-b py-2 text-sm"><span className={`badge ${l.moderation === "flagged" ? "bg-destructive text-destructive-foreground" : "bg-accent"}`}>{l.moderation}</span><span className="flex-1">{l.title}</span>
              <button onClick={() => s.updateListing(l.id, { moderation: "approved" }, "moderation.approve")} className="btn-primary min-h-9 px-3">Approve</button>
              <button onClick={() => s.updateListing(l.id, { endsAt: Date.now(), moderation: "flagged" }, "moderation.reject")} className="btn-outline min-h-9 px-3">Reject</button></div>))}</section>
        <section className="card p-5"><h2 className="mb-2 font-semibold">User verification queue</h2>
          {USERS.filter((u) => u.verification !== "id_verified").map((u) => <div key={u.id} className="flex justify-between border-b py-2 text-sm"><span>{u.name} · {u.phone}</span><span className="badge bg-muted">{u.verification}</span></div>)}</section>
        <section className="card p-5"><h2 className="mb-2 font-semibold">Payment reconciliation <span className="demo-tag">Mock</span></h2>
          <p className="mb-2 text-xs text-muted-foreground">Telebirr / CBE Birr webhooks NOT CONNECTED. Statuses are simulated.</p>
          {s.deposits.map((d) => <div key={d.id} className="flex items-center gap-2 border-b py-2 text-sm"><span className="flex-1">{d.listingId} · {etb(d.amount)} · tries {d.attempts}</span><span className="font-semibold">{d.status}</span>
            {d.status === "held" && <button onClick={() => s.setDepositStatus(d.id, "released")} className="btn-outline min-h-9 px-2">Release</button>}
            {d.status === "failed" && <button onClick={() => s.retryDeposit(d.id)} className="btn-outline min-h-9 px-2">Retry</button>}</div>)}</section>
        <section className="card space-y-3 p-5"><h2 className="font-semibold">Fees & categories</h2>
          <label className="label">Seller success fee: {s.feePercent}%</label>
          <input type="range" min={0} max={15} step={0.5} value={s.feePercent} onChange={(e) => s.setFee(Number(e.target.value))} className="w-full accent-primary" />
          <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button key={c} onClick={() => s.toggleCategory(c)} className={`chip ${s.categoriesDisabled.includes(c) ? "" : "chip-active"}`}>{c}</button>)}</div></section>
        <section className="card p-5 lg:col-span-2"><h2 className="mb-2 font-semibold">Audit timeline (hash-chained, append-only)</h2>
          {s.audit.length === 0 ? <p className="text-sm text-muted-foreground">No events yet — place a bid or change a setting.</p> :
            <ul className="max-h-80 overflow-auto font-mono text-xs">{s.audit.map((a) => <li key={a.id} className="border-b py-1.5">{fmtDate(a.at)} · <b>{a.action}</b> · {a.actor} → {a.entity} · {a.detail} · #{a.hash} ← {a.prevHash}</li>)}</ul>}</section>
        <section className="card p-5 lg:col-span-2"><h2 className="mb-2 font-semibold">System health</h2>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">{[["App", "OK (local)"], ["Database", "Not connected"], ["SMS OTP", "Not connected"], ["Payments", "Not connected"]].map(([k, v]) => <div key={k} className="rounded-lg bg-muted p-2"><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>)}</div></section>
      </div>
    </div>
  );
}