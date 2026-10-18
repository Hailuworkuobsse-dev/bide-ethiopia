import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User } from "lucide-react";
import { useStore, useNow } from "@/lib/store";
import { PageTitle } from "@/components/shell";
import { ListingCard } from "@/components/listing-card";
import { ME, USERS } from "@/lib/seed";
import { normalizeEtPhone } from "@/lib/format";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [
    { title: "My account — BidEthiopia" }, { name: "description", content: "Watchlist, bids, wins, listings and verification." },
    { property: "og:title", content: "BidEthiopia account" }, { property: "og:description", content: "Your buyer and seller dashboard." },
  ] }),
  component: Account,
});

const TABS = ["Watchlist", "Active bids", "Wins", "My listings", "Profile"] as const;

function Account() {
  const { listings, watchlist, tokens, reset } = useStore();
  const now = useNow();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Watchlist");
  const me = USERS.find((u) => u.id === ME)!;
  const [phone, setPhone] = useState(me.phone);
  const t = now ?? Date.now();
  const lists = {
    Watchlist: listings.filter((l) => watchlist.includes(l.id)),
    "Active bids": listings.filter((l) => l.endsAt > t && !l.soldTo && l.bids.some((b) => b.userId === ME)),
    Wins: listings.filter((l) => l.soldTo === ME),
    "My listings": listings.filter((l) => l.sellerId === ME),
  };
  return (
    <div>
      <PageTitle title={me.name} sub={`${me.city} · ${tokens} tokens · Verification: ${me.verification === "phone" ? "Phone verified (ID pending)" : me.verification}`} icon={User} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">{TABS.map((x) => <button key={x} onClick={() => setTab(x)} className={`chip ${tab === x ? "chip-active" : ""}`}>{x}</button>)}</div>
      {tab === "Profile" ? (
        <div className="card max-w-md space-y-3 p-5">
          <label className="label" htmlFor="ph">Phone (+251)</label>
          <input id="ph" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className={`text-sm ${normalizeEtPhone(phone) ? "text-success" : "text-destructive"}`}>{normalizeEtPhone(phone) ?? "Enter a valid Ethiopian mobile number (9XXXXXXXX or 7XXXXXXXX)."}</p>
          <p className="text-xs text-muted-foreground">SMS OTP verification is not connected in this demo.</p>
          <button onClick={reset} className="btn-outline">Reset demo data</button>
        </div>
      ) : lists[tab].length === 0 ? <div className="card p-10 text-center text-muted-foreground">Nothing here yet.</div> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{lists[tab].map((l) => <ListingCard key={l.id} l={l} now={now} />)}</div>
      )}
    </div>
  );
}