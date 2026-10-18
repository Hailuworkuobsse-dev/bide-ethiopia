import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, BadgeCheck, Star, ShieldAlert } from "lucide-react";
import { useStore, useNow } from "@/lib/store";
import { USERS } from "@/lib/seed";
import { currentPrice, minNextBid, statusOf } from "@/lib/bidding";
import { etb, fmtDate } from "@/lib/format";
import { StatusPill, FormatTag } from "@/components/listing-card";
import { ListenButton } from "@/components/shell";

export const Route = createFileRoute("/auction/$id")({
  head: () => ({ meta: [
    { title: "Auction details — BidEthiopia" },
    { name: "description", content: "View item details, bid history and place a bid in ETB." },
    { property: "og:title", content: "Auction on BidEthiopia" },
    { property: "og:description", content: "See the item and bid in Birr." },
  ] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { listings, watchlist, toggleWatch, placeBid, deposits, requestDeposit, retryDeposit, tokens } = useStore();
  const now = useNow();
  const l = listings.find((x) => x.id === id);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  if (!l) return <div className="card p-10 text-center">Auction not found. <Link to="/" className="underline">Back</Link></div>;
  const t = now ?? l.startsAt;
  const seller = USERS.find((u) => u.id === l.sellerId);
  const dep = deposits.find((d) => d.listingId === l.id);
  const live = now !== null && statusOf(l, t) === "live";
  const min = minNextBid(l, t);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = placeBid(l.id, l.format === "dutch" ? min : Number(amount));
    if (!r.ok) setErr(r.reason ?? "Bid failed"); else { setErr(""); setAmount(""); toast.success(l.format === "dutch" ? "You accepted the price (demo)." : "Bid placed (demo)."); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">
        <img src={l.images[0]} alt={l.title} width={944} height={704} className="aspect-[4/3] w-full rounded-2xl object-cover" />
        <div className="card space-y-3 p-5">
          <div className="flex flex-wrap gap-2"><FormatTag l={l} /><span className="badge bg-muted">{l.category}</span><span className="badge bg-muted">{l.condition}</span></div>
          <h1 className="text-2xl font-semibold">{l.title}</h1>
          <p>{l.description}</p>
          <ListenButton text={`${l.title}. ${l.description}. Current price ${etb(currentPrice(l, t))}`} />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries({ ...l.specs, Location: l.location, Delivery: l.delivery, ...(l.quantity ? { Quantity: `${l.quantity} ${l.unit ?? ""}` } : {}) }).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>))}
          </dl>
          <p className="text-sm text-muted-foreground"><b>Terms:</b> {l.terms}</p>
          {l.format === "dutch" && <p className="text-xs text-muted-foreground">Dutch auction (prototype logic): price drops {etb(l.dutchDropPerHour ?? 0)} per hour down to {etb(l.dutchFloor ?? 0)}. First to accept wins.</p>}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between"><StatusPill l={l} now={now} />
            <button onClick={() => toggleWatch(l.id)} className="btn-outline min-h-9"><Heart className={`size-4 ${watchlist.includes(l.id) ? "fill-destructive text-destructive" : ""}`} />Watch</button></div>
          <p className="text-sm text-muted-foreground">{l.format === "dutch" ? "Current price" : "Highest bid"}</p>
          <p className="text-3xl font-bold text-primary">{etb(currentPrice(l, t))}</p>
          <p className="text-xs text-muted-foreground">Increment {etb(l.minIncrement)} · Ends {fmtDate(l.endsAt)} · Tokens: {tokens}</p>
          {l.depositRequired ? (
            <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
              <p className="flex items-center gap-1 font-semibold"><ShieldAlert className="size-4" />Security deposit {etb(l.depositRequired)} <span className="demo-tag">Demo</span></p>
              {!dep && <button onClick={() => requestDeposit(l.id, l.depositRequired!)} className="btn-gold mt-2 w-full">Place demo deposit</button>}
              {dep && <p className="mt-1">Status: <b>{dep.status.replace(/_/g, " ")}</b>{dep.status === "pending" && " — waiting for (simulated) confirmation"}</p>}
              {dep?.status === "failed" && <button onClick={() => retryDeposit(dep.id)} className="btn-outline mt-2 w-full">Retry</button>}
            </div>) : null}
          {live ? (
            <form onSubmit={submit} className="space-y-2">
              {l.format === "english" && <><label className="label" htmlFor="amt">Your bid (min {etb(min)})</label>
                <input id="amt" className="input text-lg" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={String(min)} /></>}
              {err && <p className="text-sm font-medium text-destructive" role="alert">{err}</p>}
              <button className="btn-primary min-h-14 w-full text-base">{l.format === "dutch" ? `Accept ${etb(min)}` : "Place bid (1 token)"}</button>
            </form>) : <p className="rounded-lg bg-muted p-3 text-center text-sm">{now === null ? "Loading…" : "Bidding is closed for this auction."}</p>}
        </div>
        {seller && <div className="card p-5"><p className="font-semibold">{seller.name}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="size-4 text-gold" />{seller.rating || "New"} · {seller.sales} sales · since {seller.joined}</p>
          <p className="mt-1 flex items-center gap-1 text-sm">{seller.verification === "id_verified" ? <><BadgeCheck className="size-4 text-success" />ID verified</> : seller.verification === "phone" ? "Phone verified" : "Not verified"}</p></div>}
        <div className="card p-5"><h2 className="mb-2 font-semibold">Bid history</h2>
          {l.bids.length === 0 ? <p className="text-sm text-muted-foreground">No bids yet.</p> :
            <ul className="divide-y text-sm">{l.bids.map((b) => <li key={b.id} className="flex justify-between py-2"><span>{b.userName}</span><span className="font-semibold">{etb(b.amount)}</span></li>)}</ul>}
        </div>
      </aside>
    </div>
  );
}