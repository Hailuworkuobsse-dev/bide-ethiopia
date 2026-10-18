import type { Category, Listing } from "./types";

export interface Extracted {
  title: string; category: Category; quantity: number; unit: string;
  condition: Listing["condition"]; startingPrice: number; location?: string; confidence: "low" | "medium";
}

const KW: [Category, RegExp][] = [
  ["Coffee & Grain", /coffee|buna|teff|wheat|maize|grain|barley|sorghum|bun/i],
  ["Livestock", /cow|cattle|ox|sheep|goat|camel|chicken|heifer|bull|kebt|beg/i],
  ["Vehicles", /car|truck|toyota|hilux|bajaj|motor|vehicle|isuzu|minibus/i],
  ["Electronics", /phone|laptop|tv|samsung|iphone|computer|tablet|camera/i],
  ["Property", /house|land|apartment|condominium|plot|villa/i],
  ["Agriculture", /tractor|seed|fertilizer|irrigation|pump|harvest/i],
  ["Wholesale", /wholesale|bulk|pallet|carton|lot of/i],
];
const UNITS = ["quintal", "kg", "ton", "head", "pieces", "sacks", "cartons"];
const CITIES = ["Addis Ababa", "Adama", "Bahir Dar", "Hawassa", "Mekelle", "Dire Dawa", "Jimma", "Gondar"];

/** Rule-based DEMO extractor. Replace with a connected language model before production. */
export function extractListing(text: string): Extracted {
  const t = text.trim();
  const category = KW.find(([, r]) => r.test(t))?.[0] ?? "Home & Business";
  const qtyMatch = t.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNITS.join("|")})`, "i"));
  const priceMatch = t.match(/(\d[\d,]*)\s*(birr|etb|br)/i) ?? t.match(/(?:price|start(?:ing)?|from)\D{0,10}(\d[\d,]*)/i);
  const condition: Listing["condition"] = /\bnew\b|brand new/i.test(t) ? "New" : /like new|excellent/i.test(t) ? "Like new" : /fair|old|worn/i.test(t) ? "Used - fair" : "Used - good";
  const first = t.split(/[.,\n]/)[0].replace(/^(i (want|would like) to sell|selling|i have)\s*/i, "");
  const title = first.length > 3 ? first.charAt(0).toUpperCase() + first.slice(1, 70) : "Untitled item";
  return {
    title, category,
    quantity: qtyMatch ? Number(qtyMatch[1]) : 1,
    unit: qtyMatch ? qtyMatch[2].toLowerCase() : "item",
    condition,
    startingPrice: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : 0,
    location: CITIES.find((c) => t.toLowerCase().includes(c.toLowerCase().split(" ")[0])),
    confidence: qtyMatch && priceMatch ? "medium" : "low",
  };
}