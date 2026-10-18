import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, LogIn, UserPlus, LogOut, CheckCircle2, ShieldCheck } from "lucide-react";
import { useStore, useNow } from "@/lib/store";
import { PageTitle } from "@/components/shell";
import { ListingCard } from "@/components/listing-card";
import { normalizeEtPhone } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — BidEthiopia" },
      { name: "description", content: "Watchlist, bids, wins, listings and verification." },
      { property: "og:title", content: "BidEthiopia account" },
      { property: "og:description", content: "Your buyer and seller dashboard." },
    ],
  }),
  component: Account,
});

const TABS = ["Watchlist", "Active bids", "Wins", "My listings", "Profile", "Switch User"] as const;

export function Account() {
  const { listings, watchlist, tokens, reset, authUser, login, register, logout, backendConnected } = useStore();
  const navigate = useNavigate();
  const now = useNow();
  const [tab, setTab] = useState<(typeof TABS)[number]>(authUser ? "Watchlist" : "Switch User");
  const [phoneInput, setPhoneInput] = useState(authUser?.phone ?? "+251912000111");
  const [passwordInput, setPasswordInput] = useState("Password123!");
  const [fullNameInput, setFullNameInput] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerRole, setRegisterRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#signup") {
      setIsRegistering(true);
      setTab("Switch User");
    } else if (window.location.hash === "#signin") {
      setIsRegistering(false);
      setTab("Switch User");
    }
  }, []);

  const t = now ?? Date.now();
  const currentUserId = authUser?.id ?? "u-me";

  const lists: Record<string, typeof listings> = {
    Watchlist: listings.filter((l) => watchlist.includes(l.id)),
    "Active bids": listings.filter(
      (l) => l.endsAt > t && !l.soldTo && l.bids.some((b) => b.userId === currentUserId || b.userName === authUser?.fullName),
    ),
    Wins: listings.filter((l) => l.soldTo === currentUserId),
    "My listings": listings.filter((l) => l.sellerId === currentUserId),
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        if (!fullNameInput.trim()) throw new Error("Full name is required");
        const registration = await register({ fullName: fullNameInput, phone: phoneInput, password: passwordInput, role: registerRole });
        setIsRegistering(false);
        setPasswordInput("");
        if (registration.emailSent) {
          toast.success("Registration completed. A confirmation email was sent to your email address. Please sign in.");
        } else {
          toast.warning("Your account was created, but the confirmation email could not be sent. Contact support or try again later.");
        }
        await navigate({ to: "/account", hash: "signin", replace: true });
      } else {
        const user = await login(phoneInput, passwordInput);
        toast.success(`Welcome back, ${user.fullName}!`);
        if (user.role === "ADMIN") {
          await navigate({ to: "/admin", replace: true });
        } else if (user.role === "SELLER") {
          await navigate({ to: "/sell", replace: true });
        } else {
          setTab("Watchlist");
          await navigate({ to: "/account", replace: true });
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (phone: string, role: string) => {
    setLoading(true);
    try {
      await login(phone, "Password123!");
      toast.success(`Switched account to ${role} (${phone})`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Quick login failed");
    } finally {
      setLoading(false);
    }
  };

  const displayName = authUser?.fullName ?? "Guest Visitor";
  const displayRole = authUser?.role ?? "GUEST";
  const displayPhone = authUser?.phone ?? "Public browsing — no account";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle
          title={displayName}
          sub={`${displayPhone} · Role: ${displayRole} · ${tokens} tokens · Database: ${backendConnected ? "MySQL Synced" : "Local Mode"}`}
          icon={User}
        />
        {authUser && (
          <button onClick={logout} className="btn-outline min-h-10 text-sm">
            <LogOut className="size-4" /> Sign Out
          </button>
        )}
      </div>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((x) => (
          <button key={x} onClick={() => setTab(x)} className={`chip ${tab === x ? "chip-active" : ""}`}>
            {x}
          </button>
        ))}
      </div>

      {tab === "Switch User" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Account Switcher */}
          <div className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Sign in or create an account
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose Sign In to access your role-specific dashboard, or switch to registration to create a Buyer or Seller account.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("+251912000111", "Buyer")}
                className="w-full flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted transition"
              >
                <div>
                  <p className="font-semibold text-sm">Selam Tesfaye (Buyer)</p>
                  <p className="text-xs text-muted-foreground">+251 912 000 111</p>
                </div>
                <span className="badge bg-secondary">BUYER</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("+251917222333", "Seller")}
                className="w-full flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted transition"
              >
                <div>
                  <p className="font-semibold text-sm">Jimma Coffee Union (Seller)</p>
                  <p className="text-xs text-muted-foreground">+251 917 222 333</p>
                </div>
                <span className="badge bg-primary text-primary-foreground">SELLER</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin("+251911234567", "Admin")}
                className="w-full flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted transition"
              >
                <div>
                  <p className="font-semibold text-sm">Abebe Admin (Admin)</p>
                  <p className="text-xs text-muted-foreground">+251 911 234 567</p>
                </div>
                <span className="badge bg-destructive text-destructive-foreground">ADMIN</span>
              </button>
            </div>
          </div>

          {/* Custom Login / Register form */}
          <div className="card space-y-4 p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {isRegistering ? <UserPlus className="size-5 text-primary" /> : <LogIn className="size-5 text-primary" />}
              {isRegistering ? "Create your BidEthiopia account" : "Sign in to BidEthiopia"}
            </h2>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {isRegistering && (
                <>
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      className="input"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="e.g. Dawit Kebede"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Account Type</label>
                    <select className="input" value={registerRole} onChange={(e) => setRegisterRole(e.target.value as "BUYER" | "SELLER")}>
                      <option value="BUYER">Buyer — browse and bid on auctions</option>
                      <option value="SELLER">Seller — create and manage auction listings</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Admin access is assigned separately by an authorized administrator.</p>
                  </div>
                </>
              )}
              <div>
                <label className="label">Phone Number (+251...)</label>
                <input
                  className="input"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+251912345678"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Min 10 characters"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Processing..." : isRegistering ? "Sign Up" : "Sign In"}
              </button>
            </form>
            <div className="space-y-3 text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-primary underline"
              >
                {isRegistering ? "Already registered? Sign in instead" : "New to BidEthiopia? Sign up"}
              </button>
              {!authUser && <div>
                <button
                  type="button"
                  onClick={() => { logout(); setTab("Watchlist"); void navigate({ to: "/", replace: true }); toast.info("Continuing as guest. You can browse public auctions without signing in."); }}
                  className="btn-outline w-full"
                >
                  Continue as Guest
                </button>
              </div>}
            </div>
          </div>
        </div>
      ) : tab === "Profile" ? (
        <div className="card max-w-md space-y-4 p-5">
          <div>
            <span className="text-xs text-muted-foreground">Account Full Name</span>
            <p className="font-semibold text-lg">{displayName}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Assigned Role</span>
            <p>
              <span className="badge bg-primary text-primary-foreground">{displayRole}</span>
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Phone Number</span>
            <p className="font-mono text-sm">{displayPhone}</p>
            <p className={`text-xs mt-1 ${normalizeEtPhone(displayPhone) ? "text-success" : "text-destructive"}`}>
              {normalizeEtPhone(displayPhone) ? "Verified format (+251 standard mobile)" : "Invalid phone format"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Backend API Status</span>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <CheckCircle2 className={`size-4 ${backendConnected ? "text-emerald-500" : "text-amber-500"}`} />
              {backendConnected ? "Connected to Backend REST API (port 3410)" : "Disconnected / Local Prototype"}
            </p>
          </div>
          <div className="pt-2 border-t flex gap-2">
            <button onClick={reset} className="btn-outline text-xs">
              Reset Demo Cache
            </button>
          </div>
        </div>
      ) : (lists[tab]?.length ?? 0) === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">Nothing here yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(lists[tab] ?? []).map((l) => (
            <ListingCard key={l.id} l={l} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}