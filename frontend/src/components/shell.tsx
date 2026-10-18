import { Link, useRouterState } from "@tanstack/react-router";
import { Gavel, Home, PlusCircle, User, Bell, Coins, Shield, ListChecks, Volume2, Mic, MicOff, Languages } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore, type Lang } from "@/lib/store";

const LABELS: Record<Lang, Record<string, string>> = {
  en: { home: "Browse", sell: "Sell", account: "Account", alerts: "Alerts", tokens: "Tokens", admin: "Admin" },
  am: { home: "ፈልግ", sell: "ሽጥ", account: "መለያ", alerts: "ማሳወቂያ", tokens: "ቶከን", admin: "አስተዳዳሪ" },
  om: { home: "Barbaadi", sell: "Gurguri", account: "Herrega", alerts: "Beeksisa", tokens: "Tookana", admin: "Bulchaa" },
  ti: { home: "ድለ", sell: "ሸጥ", account: "ሕሳብ", alerts: "መፍለጢ", tokens: "ቶከን", admin: "ኣመሓዳሪ" },
};
export const LANG_NAMES: Record<Lang, string> = { en: "English", am: "አማርኛ Amharic", om: "Afaan Oromoo", ti: "ትግርኛ Tigrinya" };

export function AppShell({ children }: { children: ReactNode }) {
  const { lang, setLang, notifications, tokens, hydrated, backendConnected, authUser } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const t = LABELS[lang] ?? LABELS.en;
  const unread = notifications.filter((n) => !n.read).length;
  const nav = [
    { to: "/", label: t["home"] ?? "Browse", icon: Home },
    { to: "/sell", label: t["sell"] ?? "Sell", icon: PlusCircle },
    { to: "/notifications", label: t["alerts"] ?? "Alerts", icon: Bell, badge: unread },
    { to: "/account", label: t["account"] ?? "Account", icon: User },
  ] as const;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-950/10 border-b px-4 py-1.5 text-xs font-semibold text-accent-foreground">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-2.5 rounded-full ${backendConnected ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-amber-500 animate-pulse"}`} />
          <span className="font-mono">{backendConnected ? "Live API: http://localhost:3410 (MySQL: 3307)" : "Connecting to API :3410..."}</span>
        </div>
        <div className="flex items-center gap-3">
          {authUser ? (
            <span className="text-primary font-medium">Signed in: <b>{authUser.fullName}</b> ({authUser.role})</span>
          ) : (
            <Link to="/account" className="underline text-primary">Login / Register</Link>
          )}
          <Link to="/integrations" className="hidden opacity-75 underline sm:inline">Docs</Link>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Gavel className="size-5" /></span>
            <span className="font-display text-xl font-semibold">Bid<span className="text-primary">Ethiopia</span></span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {[...nav, { to: "/tokens", label: t["tokens"] ?? "Tokens", icon: Coins }, { to: "/admin", label: t["admin"] ?? "Admin", icon: Shield }].map((n) => (
              <Link key={n.to} to={n.to} className={`btn-ghost relative ${path === n.to ? "bg-muted text-primary" : ""}`}>
                <n.icon className="size-4" />{n.label}
                {"badge" in n && n.badge ? <span className="badge absolute -right-1 -top-1 bg-destructive text-destructive-foreground">{n.badge}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/tokens" className="badge min-h-9 border bg-card px-3 text-sm" aria-label="Token balance">
              <Coins className="size-4 text-gold" />{hydrated ? tokens : "–"}
            </Link>
            <label className="relative flex items-center">
              <Languages className="pointer-events-none absolute left-2 size-4 text-muted-foreground" />
              <span className="sr-only">Language</span>
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="input min-h-9 w-auto py-0 pl-8 pr-2 text-sm">
                {(Object.keys(LANG_NAMES) as Lang[]).map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
              </select>
            </label>
          </div>
        </div>
        {lang !== "en" && (
          <p className="bg-secondary px-4 py-1 text-center text-xs text-secondary-foreground">Prototype translation: only navigation labels are translated. Full {LANG_NAMES[lang]} support needs professional translation.</p>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto hidden max-w-6xl px-4 py-8 text-sm text-muted-foreground md:block">
        © 2026 BidEthiopia prototype · Times shown in Africa/Addis_Ababa (EAT) · <Link to="/integrations" className="underline">Integration checklist</Link>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card md:hidden">
        {[...nav, { to: "/tokens", label: t["tokens"] ?? "Tokens", icon: Coins }].map((n) => (
          <Link key={n.to} to={n.to} className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${path === n.to ? "text-primary" : "text-muted-foreground"}`}>
            <n.icon className="size-6" />{n.label}
            {"badge" in n && n.badge ? <span className="badge absolute right-4 top-1.5 bg-destructive text-destructive-foreground">{n.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function ListenButton({ text, label = "Listen" }: { text: string; label?: string }) {
  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };
  return (
    <button type="button" onClick={speak} className="btn-outline min-h-9 px-3 text-xs" aria-label={`Read aloud: ${label}`}>
      <Volume2 className="size-4" />{label}
    </button>
  );
}

type SR = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };

const SR_LANG: Record<Lang, string> = { en: "en-US", am: "am-ET", om: "om-ET", ti: "ti-ET" };

export function MicButton({ lang, onText, demoText }: { lang: Lang; onText: (t: string) => void; demoText: string }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [note, setNote] = useState("");
  const rec = useRef<SR | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  const start = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) { onText(demoText); setNote("Voice input is not available in this browser — inserted a demo description."); return; }
    const r = new C();
    r.lang = SR_LANG[lang]; r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); setNote("Could not hear clearly. Try again or type instead."); };
    rec.current = r; r.start(); setListening(true); setNote(lang === "en" ? "" : "Browser recognition for this language may be limited or unavailable.");
  };
  return (
    <div>
      <button type="button" onClick={listening ? () => rec.current?.stop() : start}
        className={`btn min-h-16 w-full text-base ${listening ? "bg-destructive text-destructive-foreground" : "bg-gold text-gold-foreground"}`}>
        {listening ? <MicOff className="size-6" /> : <Mic className="size-6" />}
        {listening ? "Stop listening" : supported ? "Tap and speak about your item" : "Use demo voice sample"}
      </button>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function PageTitle({ title, sub, icon: Icon = ListChecks, right }: { title: string; sub?: string; icon?: typeof Home; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-6" /></span>
        <div><h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}</div>
      </div>
      {right}
    </div>
  );
}