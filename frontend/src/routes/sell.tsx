import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, PlusCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { extractListing, type Extracted } from "@/lib/extract";
import { CATEGORIES, LOCATIONS, type Category, type AuctionFormat } from "@/lib/types";
import { CATEGORY_IMAGE } from "@/lib/seed";
import { MicButton, PageTitle, ListenButton } from "@/components/shell";
import { uid, etb } from "@/lib/format";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [
    { title: "Sell an item — BidEthiopia" },
    { name: "description", content: "Create an auction listing with the AI listing assistant." },
    { property: "og:title", content: "Sell on BidEthiopia" },
    { property: "og:description", content: "Speak or type to list your item." },
  ] }),
  component: Sell,
});

function Sell() {
  const { lang, addListing, authUser } = useStore();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [ex, setEx] = useState<Extracted | null>(null);
  const [f, setF] = useState({ title: "", category: "Electronics" as Category, description: "", location: "Addis Ababa", price: "", inc: "", days: "3", format: "english" as AuctionFormat, deposit: "", delivery: "pickup" as "pickup" | "delivery" | "both", terms: "Winner pays within 48 hours." });
  const [errs, setErrs] = useState<Record<string, string>>({});

  const confirm = () => { if (!ex) return; setF({ ...f, title: ex.title, category: ex.category, description: text, price: String(ex.startingPrice || ""), location: ex.location ?? f.location }); setEx(null); toast.success("Details copied into the form. Please review."); };

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.title.trim().length < 5) er["title"] = "Title needs at least 5 characters.";
    if (!(Number(f.price) > 0)) er["price"] = "Enter an opening price in Birr.";
    if (!(Number(f.inc) > 0)) er["inc"] = "Enter a minimum increment.";
    setErrs(er); if (Object.keys(er).length) return;
    const now = Date.now(); const id = `l-${uid()}`;
    addListing({ id, title: f.title, category: f.category, description: f.description, condition: "Used - good", specs: {}, location: f.location, images: [CATEGORY_IMAGE[f.category]], format: f.format,
      openingPrice: Number(f.price), minIncrement: Number(f.inc), dutchFloor: f.format === "dutch" ? Number(f.price) * 0.7 : undefined, dutchDropPerHour: f.format === "dutch" ? Number(f.inc) : undefined,
      startsAt: now, endsAt: now + Number(f.days) * 86_400_000, depositRequired: Number(f.deposit) || undefined, delivery: f.delivery, terms: f.terms, sellerId: authUser!.id, bids: [], moderation: "approved" });
    toast.success("Listing published and synced to MySQL!"); nav({ to: "/auction/$id", params: { id } });
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (!authUser) {
    return <div className="card mx-auto max-w-xl space-y-3 p-8 text-center">
      <h1 className="text-xl font-semibold">Sign in to sell on BidEthiopia</h1>
      <p className="text-sm text-muted-foreground">Guests can browse public auctions. Create an account and choose Seller to publish listings.</p>
      <a className="btn-primary inline-flex justify-center" href="/account">Sign in or register</a>
    </div>;
  }
  if (authUser.role !== "SELLER" && authUser.role !== "ADMIN") {
    return <div className="card mx-auto max-w-xl space-y-3 p-8 text-center">
      <h1 className="text-xl font-semibold">Seller account required</h1>
      <p className="text-sm text-muted-foreground">Your current role is {authUser.role}. Sign out and register a Seller account, or contact an administrator to change your role.</p>
      <a className="btn-outline inline-flex justify-center" href="/account">Go to account</a>
    </div>;
  }

  if (authUser.status !== "ACTIVE") {
    return <div className="card mx-auto max-w-xl space-y-3 p-8 text-center">
      <h1 className="text-xl font-semibold">Seller verification pending</h1>
      <p className="text-sm text-muted-foreground">Your account must be activated by an administrator before you can publish listings. You can continue browsing auctions while you wait.</p>
      <a className="btn-outline inline-flex justify-center" href="/">Browse auctions</a>
    </div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageTitle title="Sell an item" sub="Step 1: describe it. Step 2: check details. Step 3: publish." icon={PlusCircle} />
      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-5 text-gold" />AI listing assistant <span className="demo-tag">Demo</span></h2>
        <p className="text-sm text-muted-foreground">Speak or type what you are selling. We suggest details — you confirm them. (Demo uses simple rules, not a connected AI model.)</p>
        <MicButton lang={lang} onText={(t) => setText(t)} demoText="Selling 20 quintal white teff from Bahir Dar, new harvest, starting 260000 birr" />
        <textarea className="input min-h-24 py-2" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 10 sacks of washed coffee in Jimma, starting 300000 birr" />
        <button type="button" disabled={!text.trim()} onClick={() => setEx(extractListing(text))} className="btn-primary w-full">Suggest details</button>
        {ex && <div className="rounded-lg bg-secondary p-4 text-sm">
          <p className="mb-2 font-semibold">Is this correct? (confidence: {ex.confidence})</p>
          <ul className="grid grid-cols-2 gap-1"><li>Title: <b>{ex.title}</b></li><li>Category: <b>{ex.category}</b></li><li>Quantity: <b>{ex.quantity} {ex.unit}</b></li><li>Condition: <b>{ex.condition}</b></li><li>Start: <b>{ex.startingPrice ? etb(ex.startingPrice) : "—"}</b></li></ul>
          <div className="mt-3 flex gap-2"><button onClick={confirm} className="btn-primary flex-1">Yes, use these</button><button onClick={() => setEx(null)} className="btn-outline">No</button>
            <ListenButton text={`${ex.title}, ${ex.category}, ${ex.quantity} ${ex.unit}`} /></div>
        </div>}
      </section>
      <form onSubmit={publish} className="card space-y-4 p-5" noValidate>
        <div><label className="label">Title</label><input className="input" value={f.title} onChange={set("title")} />{errs["title"] && <p className="text-sm text-destructive">{errs["title"]}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Category</label><select className="input" value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Location</label><select className="input" value={f.location} onChange={set("location")}>{LOCATIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div><label className="label">Description</label><textarea className="input min-h-20 py-2" value={f.description} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Auction type</label><select className="input" value={f.format} onChange={set("format")}><option value="english">English (price goes up)</option><option value="dutch">Dutch (price goes down)</option></select></div>
          <div><label className="label">Duration</label><select className="input" value={f.days} onChange={set("days")}>{["1", "3", "7", "14"].map((d) => <option key={d} value={d}>{d} day(s)</option>)}</select></div>
          <div><label className="label">Opening price (ETB)</label><input className="input" inputMode="numeric" value={f.price} onChange={set("price")} />{errs["price"] && <p className="text-sm text-destructive">{errs["price"]}</p>}</div>
          <div><label className="label">{f.format === "dutch" ? "Drop per hour (ETB)" : "Min increment (ETB)"}</label><input className="input" inputMode="numeric" value={f.inc} onChange={set("inc")} />{errs["inc"] && <p className="text-sm text-destructive">{errs["inc"]}</p>}</div>
          <div><label className="label">Deposit (optional)</label><input className="input" inputMode="numeric" value={f.deposit} onChange={set("deposit")} /></div>
          <div><label className="label">Delivery</label><select className="input" value={f.delivery} onChange={set("delivery")}><option value="pickup">Pickup</option><option value="delivery">Delivery</option><option value="both">Both</option></select></div>
        </div>
        <div><label className="label">Terms</label><input className="input" value={f.terms} onChange={set("terms")} /></div>
        <button className="btn-gold min-h-14 w-full text-base">Publish listing</button>
      </form>
    </div>
  );
}