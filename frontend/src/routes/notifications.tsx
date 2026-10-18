import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageTitle } from "@/components/shell";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "Notifications — BidEthiopia" }, { name: "description", content: "Outbid, ending soon, won and sold alerts." },
    { property: "og:title", content: "BidEthiopia alerts" }, { property: "og:description", content: "Your auction notifications." },
  ] }),
  component: Notifs,
});

function Notifs() {
  const { notifications, markRead } = useStore();
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Notifications" sub="Demo examples — no SMS is sent." icon={Bell} right={<button onClick={() => markRead()} className="btn-outline">Mark all read</button>} />
      <ul className="space-y-2">{notifications.map((n) => (
        <li key={n.id} className={`card flex gap-3 p-4 ${n.read ? "opacity-70" : "border-primary"}`}>
          <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.read ? "bg-muted" : "bg-primary"}`} />
          <div className="flex-1"><p className="font-semibold">{n.title}</p><p className="text-sm">{n.body}</p><p className="text-xs text-muted-foreground">{fmtDate(n.at)}</p>
            <div className="mt-2 flex gap-2">{n.listingId && <Link to="/auction/$id" params={{ id: n.listingId }} className="btn-outline min-h-9">View</Link>}
              {!n.read && <button onClick={() => markRead(n.id)} className="btn-ghost min-h-9">Mark read</button>}</div></div>
        </li>))}</ul>
    </div>
  );
}