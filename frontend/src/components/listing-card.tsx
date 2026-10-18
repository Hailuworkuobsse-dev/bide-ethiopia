import { Link } from "@tanstack/react-router";
import { Heart, MapPin, BadgeCheck, Clock, TrendingDown, TrendingUp } from "lucide-react";
import type { Listing } from "@/lib/types";
import { currentPrice, statusOf } from "@/lib/bidding";
import { countdown, etb } from "@/lib/format";
import { useStore } from "@/lib/store";
import { USERS } from "@/lib/seed";

export function StatusPill({ l, now }: { l: Listing; now: number | null }) {
  if (now === null) return <span className="badge bg-muted text-muted-foreground"><Clock className="size-3" />…</span>;
  const st = statusOf(l, now);
  if (st === "ended") return <span className="badge bg-muted text-muted-foreground">Ended</span>;
  if (st === "scheduled") return <span className="badge bg-secondary text-secondary-foreground"><Clock className="size-3" />Starts in {countdown(l.startsAt - now)}</span>;
  const left = l.endsAt - now;
  return <span className={`badge ${left < 3_600_000 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}><Clock className="size-3" />{countdown(left)}</span>;
}

export function FormatTag({ l }: { l: Listing }) {
  return l.format === "dutch"
    ? <span className="badge bg-accent text-accent-foreground"><TrendingDown className="size-3" />Dutch (descending)</span>
    : <span className="badge bg-secondary text-secondary-foreground"><TrendingUp className="size-3" />English (ascending)</span>;
}

export function ListingCard({ l, now }: { l: Listing; now: number | null }) {
  const { watchlist, toggleWatch } = useStore();
  const seller = USERS.find((u) => u.id === l.sellerId);
  const watched = watchlist.includes(l.id);
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <Link to="/auction/$id" params={{ id: l.id }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img src={l.images[0]} alt={l.title} loading="lazy" width={944} height={704} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute left-2 top-2"><StatusPill l={l} now={now} /></div>
        </div>
      </Link>
      <button onClick={() => toggleWatch(l.id)} aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
        className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-card/95 shadow">
        <Heart className={`size-5 ${watched ? "fill-destructive text-destructive" : "text-foreground"}`} />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <FormatTag l={l} />
        <Link to="/auction/$id" params={{ id: l.id }} className="line-clamp-2 font-semibold leading-snug hover:text-primary">{l.title}</Link>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{l.location}
          {seller?.verification === "id_verified" && <span className="ml-auto flex items-center gap-0.5 text-success"><BadgeCheck className="size-3.5" />Verified seller</span>}
        </p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div><p className="text-xs text-muted-foreground">{l.format === "dutch" ? "Current price" : l.bids.length ? "Current bid" : "Opening"}</p>
            <p className="text-lg font-bold text-primary">{etb(currentPrice(l, now ?? l.startsAt))}</p></div>
          <p className="text-xs text-muted-foreground">{l.bids.length} bid{l.bids.length === 1 ? "" : "s"}</p>
        </div>
      </div>
    </article>
  );
}