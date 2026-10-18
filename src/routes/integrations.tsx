import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PageTitle } from "@/components/shell";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [
    { title: "Production checklist — BidEthiopia" }, { name: "description", content: "What remains before BidEthiopia goes live." },
    { property: "og:title", content: "BidEthiopia production checklist" }, { property: "og:description", content: "Integrations still required." },
  ] }),
  component: Page,
});

const ITEMS = [
  ["SMS OTP provider", "Phone sign-in and verification for +251 numbers."],
  ["Speech-to-text / text-to-speech", "Models validated for Amharic, Afaan Oromoo and Tigrinya. Browser speech is a fallback only."],
  ["AI listing extraction", "Replace the rule-based demo extractor with a connected language model."],
  ["CBE Birr & Telebirr merchant APIs", "Official credentials, docs, signed webhooks; currently adapter placeholders."],
  ["Payment compliance / legal review", "Deposits, escrow and settlement flows need NBE-aligned legal approval."],
  ["Server-side bid engine", "Atomic, row-locked bid transactions; anti-sniping; Dutch auction settlement."],
  ["Production auth, roles & row-level security", "Server-enforced admin/seller/buyer permissions."],
  ["Persistent database", "Listings, bids, watchlists, token ledger, deposits, notifications, audit events."],
  ["Professional translations", "Full UI in Amharic, Afaan Oromoo, Tigrinya."],
  ["Monitoring, load & security testing", "Error tracking, uptime, penetration and concurrency tests."],
];

function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Before production" sub="This app is a demo. Everything below is still required." icon={ListChecks} />
      <ul className="space-y-2">{ITEMS.map(([t, d]) => <li key={t} className="card flex gap-3 p-4"><input type="checkbox" disabled className="mt-1 size-5" aria-label={`${t} not done`} /><div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div></li>)}</ul>
    </div>
  );
}