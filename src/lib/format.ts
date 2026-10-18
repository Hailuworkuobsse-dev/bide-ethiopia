export const etb = (n: number) => `${Math.round(n).toLocaleString("en-US")} ETB`;

export const TZ = "Africa/Addis_Ababa";
export const fmtDate = (t: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(t) + " EAT";

export function countdown(ms: number): string {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

/** Ethiopian mobile: +251 9XXXXXXXX or 7XXXXXXXX (Safaricom). */
export function normalizeEtPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "").replace(/^251/, "").replace(/^0/, "");
  return /^[79]\d{8}$/.test(d) ? `+251 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : null;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}