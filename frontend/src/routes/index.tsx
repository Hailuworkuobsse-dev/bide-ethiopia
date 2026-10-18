import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useStore, useNow } from "@/lib/store";
import { CATEGORIES, LOCATIONS } from "@/lib/types";
import { currentPrice, statusOf } from "@/lib/bidding";
import { ListingCard } from "@/components/listing-card";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "BidEthiopia — Browse live auctions in Birr" },
    { name: "description", content: "Free public auctions for vehicles, coffee, livestock, electronics and more across Ethiopia." },
    { property: "og:title", content: "BidEthiopia — Live auctions" },
    { property: "og:description", content: "Browse and bid on Ethiopian auctions in ETB." },
  ] }),
  component: Index,
});

function Index() {
  const { listings, categoriesDisabled } = useStore();
  const now = useNow();
  const [q, setQ] = useState(""); const [submittedQ, setSubmittedQ] = useState(""); const [cat, setCat] = useState(""); const [status, setStatus] = useState("all");
  const [loc, setLoc] = useState(""); const [max, setMax] = useState(""); const [sort, setSort] = useState("ending");
  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = q.trim();
    setSubmittedQ(query);
    const priceMatch = query.match(/(?:under|below|less than|max(?:imum)?|up to)\s*(?:etb|birr)?\s*([\d,]+)/i);
    if (priceMatch) setMax(priceMatch[1].replace(/,/g, ""));
    const locationMatch = LOCATIONS.find((location) => query.toLowerCase().includes(location.toLowerCase()));
    if (locationMatch) setLoc(locationMatch);
    const categoryMatch = CATEGORIES.find((category) => query.toLowerCase().includes(category.toLowerCase()));
    if (categoryMatch && !categoriesDisabled.includes(categoryMatch)) setCat(categoryMatch);
    if (/\b(live|active|open)\b/i.test(query)) setStatus("live");
    else if (/\b(upcoming|scheduled)\b/i.test(query)) setStatus("scheduled");
    else if (/\b(ended|closed)\b/i.test(query)) setStatus("ended");
  };
  const items = useMemo(() => {
    const t = now ?? Date.now();
    return listings
      .filter((l) => l.moderation === "approved" && !categoriesDisabled.includes(l.category))
      .filter((l) => {
        const query = submittedQ.toLowerCase().replace(/(?:under|below|less than|max(?:imum)?|up to)\s*(?:etb|birr)?\s*[\d,]+/i, "").replace(/\b(live|active|open|upcoming|scheduled|ended|closed)\b/gi, "").trim();
        if (!query) return true;
        const searchable = `${l.title} ${l.description} ${l.category} ${l.location}`.toLowerCase();
        const terms = query.split(/\s+/).filter((term) => term.length > 1 && !["in", "the", "for", "and", "with", "birr", "etb"].includes(term));
        return terms.every((term) => searchable.includes(term));
      })
      .filter((l) => !cat || l.category === cat).filter((l) => !loc || l.location === loc)
      .filter((l) => status === "all" || (status === "soon" ? statusOf(l, t) === "live" && l.endsAt - t < 6 * 3_600_000 : statusOf(l, t) === status))
      .filter((l) => !max || currentPrice(l, t) <= Number(max))
      .sort((a, b) => sort === "ending" ? a.endsAt - b.endsAt : sort === "low" ? currentPrice(a, t) - currentPrice(b, t) : sort === "high" ? currentPrice(b, t) - currentPrice(a, t) : b.bids.length - a.bids.length);
  }, [listings, submittedQ, cat, status, loc, max, sort, now, categoriesDisabled]);

  return (
    <div>
      <section className="hero-bg mb-6 rounded-2xl p-6 text-primary-foreground md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold md:text-5xl">Buy and sell at fair prices.</h1>
            <p className="mt-2 max-w-xl opacity-90">Free to browse. Transparent bidding in Birr. Sign in or create an account to get started.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link to="/account" hash="#signin" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/70 px-5 font-semibold text-primary-foreground transition hover:bg-white/10">Sign In</Link>
            <Link to="/account" hash="#signup" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 font-semibold text-emerald-950 transition hover:bg-white/90">Sign Up</Link>
          </div>
        </div>
        <form onSubmit={submitSearch} className="mt-5 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <label className="relative block min-w-0 flex-1">
            <Search className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: Hilux in Addis Ababa under 500,000 ETB" aria-label="Search auctions by item, location, price or status" className="input min-h-12 pl-10 text-foreground" />
          </label>
          <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 font-semibold text-emerald-950 transition hover:bg-white/90">
            <Search className="size-4" /> Search
          </button>
        </form>
      </section>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setCat("")} className={`chip ${!cat ? "chip-active" : ""}`}>All</button>
        {CATEGORIES.filter((c) => !categoriesDisabled.includes(c)).map((c) => <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? "chip-active" : ""}`}>{c}</button>)}
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option><option value="live">Live</option><option value="soon">Ending soon</option><option value="scheduled">Upcoming</option><option value="ended">Ended</option>
        </select>
        <select className="input" value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Location"><option value="">All locations</option>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select>
        <input className="input" inputMode="numeric" placeholder="Max price (ETB)" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="ending">Ending soonest</option><option value="low">Price: low → high</option><option value="high">Price: high → low</option><option value="bids">Most bids</option>
        </select>
      </div>
      {items.length === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">No auctions match. Try clearing filters.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((l) => <ListingCard key={l.id} l={l} now={now} />)}</div>
      )}
    </div>
  );
}