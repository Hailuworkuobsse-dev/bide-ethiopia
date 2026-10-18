import { createFileRoute } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PageTitle } from "@/components/shell";
import { TOKEN_PACKAGES } from "@/lib/seed";
import { etb, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/tokens")({
  head: () => ({ meta: [
    { title: "Bid tokens — BidEthiopia" }, { name: "description", content: "Token packages, success fee and deposit explanation." },
    { property: "og:title", content: "BidEthiopia tokens" }, { property: "og:description", content: "Demo token packages in ETB." },
  ] }),
  component: Tokens,
});

function Tokens() {
  const { tokens, buyTokens, tokenTx, feePercent, deposits, hydrated } = useStore();
  return (
    <div className="space-y-6">
      <PageTitle title="Bid tokens" sub={`Balance: ${hydrated ? tokens : "–"} tokens · 1 token per bid`} icon={Coins} />
      <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground"><b>DEMO / NOT CONNECTED:</b> Telebirr and CBE Birr are not integrated. Buying here adds demo tokens only — no money is charged.</p>
      <div className="grid gap-4 md:grid-cols-3">{TOKEN_PACKAGES.map((p) => (
        <div key={p.id} className={`card p-5 ${p.popular ? "border-gold border-2" : ""}`}>
          {p.popular && <span className="badge bg-gold text-gold-foreground">Popular</span>}
          <h2 className="mt-1 text-xl font-semibold">{p.name}</h2><p className="text-3xl font-bold text-primary">{p.tokens} tokens</p><p className="text-muted-foreground">{etb(p.price)}</p>
          <button onClick={() => { buyTokens(p.name, p.tokens, p.price); toast.success(`${p.tokens} demo tokens added. No payment made.`); }} className="btn-primary mt-4 w-full">Get (demo)</button>
        </div>))}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5"><h2 className="font-semibold">Seller success fee</h2><p className="text-sm">When your item sells, BidEthiopia charges <b>{feePercent}%</b> of the final price. Example: 100,000 ETB sale → {etb(100000 * feePercent / 100)} fee.</p></div>
        <div className="card p-5"><h2 className="font-semibold">Security deposits <span className="demo-tag">Demo ledger</span></h2>
          <p className="text-sm text-muted-foreground">Some auctions need a deposit. Statuses: pending → held → released (if you lose) or applied to winner. Release can take time and may need retries; no real escrow exists yet.</p>
          <ul className="mt-2 divide-y text-sm">{deposits.map((d) => <li key={d.id} className="flex justify-between py-1.5"><span>{d.listingId} · {etb(d.amount)}</span><span className="font-semibold">{d.status.replace(/_/g, " ")}</span></li>)}</ul></div>
      </div>
      <div className="card p-5"><h2 className="mb-2 font-semibold">Token history</h2><ul className="divide-y text-sm">{tokenTx.map((t) => <li key={t.id} className="flex justify-between py-1.5"><span>{t.label}<br /><span className="text-xs text-muted-foreground">{fmtDate(t.at)}</span></span><span className={t.delta > 0 ? "text-success font-semibold" : ""}>{t.delta > 0 ? "+" : ""}{t.delta}</span></li>)}</ul></div>
    </div>
  );
}