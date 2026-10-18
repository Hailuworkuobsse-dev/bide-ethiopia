import type { Listing, User, Notification, Deposit, TokenTx, Category } from "./types";

// Stable remote demo images; no missing local asset imports.
export const CATEGORY_IMAGE: Record<Category, string> = {
  Electronics: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
  Vehicles: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
  Agriculture: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80",
  Livestock: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1200&q=80",
  "Coffee & Grain": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80",
  "Home & Business": "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
  Property: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
  Wholesale: "https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=1200&q=80",
};

export const ME = "u-me";

export const USERS: User[] = [
  { id: ME, name: "Selam Tesfaye", phone: "+251 911 234 567", city: "Addis Ababa", verification: "phone", rating: 4.7, sales: 3, joined: "2025-03", role: "admin" },
  { id: "u-abebe", name: "Abebe Trading PLC", phone: "+251 912 000 111", city: "Adama", verification: "id_verified", rating: 4.9, sales: 128, joined: "2023-06", role: "user" },
  { id: "u-jimma", name: "Jimma Coffee Union", phone: "+251 917 222 333", city: "Jimma", verification: "id_verified", rating: 4.8, sales: 64, joined: "2024-01", role: "user" },
  { id: "u-hana", name: "Hana Motors", phone: "+251 913 444 555", city: "Addis Ababa", verification: "id_verified", rating: 4.6, sales: 41, joined: "2024-05", role: "user" },
  { id: "u-tadesse", name: "Tadesse Farm", phone: "+251 920 666 777", city: "Bahir Dar", verification: "phone", rating: 4.3, sales: 9, joined: "2025-01", role: "user" },
  { id: "u-new", name: "Dawit K.", phone: "+251 930 888 999", city: "Hawassa", verification: "unverified", rating: 0, sales: 0, joined: "2026-09", role: "user" },
];

const H = 3_600_000;
const bidders = ["Meron A.", "Yonas B.", "Kebede T.", "Liya G.", "Samuel W."];

function mk(now: number, i: number, p: Partial<Listing> & Pick<Listing, "title" | "category" | "openingPrice" | "sellerId" | "location">, nBids = 0, endH = 24): Listing {
  const id = `l-${i}`;
  const startsAt = p.startsAt ?? now - 6 * H;
  const inc = p.minIncrement ?? Math.max(50, Math.round(p.openingPrice * 0.02 / 50) * 50);
  const bids = Array.from({ length: nBids }, (_, k) => ({
    id: `${id}-b${k}`, listingId: id, userId: `u-b${k % 5}`, userName: bidders[k % 5],
    amount: p.openingPrice + inc * (k + 1) + (k > 2 ? inc : 0), at: startsAt + (k + 1) * 0.6 * H,
  })).reverse();
  return {
    id, description: "", condition: "Used - good", specs: {}, images: [CATEGORY_IMAGE[p.category]], format: "english",
    minIncrement: inc, startsAt, endsAt: now + endH * H, delivery: "pickup",
    terms: "Winner pays within 48 hours. Inspection allowed before final payment. Demo listing.",
    bids, moderation: "approved", ...p,
  };
}

export function seedListings(now: number): Listing[] {
  return [
    mk(now, 1, { title: "Toyota Hilux 2019 Double Cab 4x4", category: "Vehicles", openingPrice: 4_200_000, sellerId: "u-hana", location: "Addis Ababa", condition: "Used - good", depositRequired: 50_000, delivery: "pickup",
      description: "Single owner, full service history at Moenco. 86,000 km. Customs cleared, plate code 3.", specs: { Year: "2019", Mileage: "86,000 km", Fuel: "Diesel", Transmission: "Manual" } }, 7, 5),
    mk(now, 2, { title: "Washed Yirgacheffe Grade 1 Green Coffee — 60 sacks", category: "Coffee & Grain", openingPrice: 1_850_000, sellerId: "u-jimma", location: "Jimma", quantity: 60, unit: "sacks (60 kg)", condition: "New", depositRequired: 25_000, delivery: "both",
      description: "2026 harvest, ECX-graded, moisture 10.5%. Warehouse pickup in Jimma or delivery to Addis at buyer cost.", specs: { Grade: "Grade 1", Process: "Washed", Moisture: "10.5%", Origin: "Yirgacheffe" } }, 12, 30),
    mk(now, 3, { title: "Boran Bull, 3 years, ~450 kg", category: "Livestock", openingPrice: 95_000, sellerId: "u-tadesse", location: "Bahir Dar", quantity: 1, unit: "head",
      description: "Healthy, vaccinated (LSD, FMD). Veterinary certificate available.", specs: { Breed: "Boran", Age: "3 years", Weight: "~450 kg" } }, 4, 0.6),
    mk(now, 4, { title: "Samsung Galaxy S24 Ultra 256GB", category: "Electronics", openingPrice: 85_000, sellerId: "u-abebe", location: "Addis Ababa", condition: "Like new", delivery: "delivery",
      description: "Unlocked, 6 months old, box and charger included.", specs: { Storage: "256 GB", Color: "Titanium Black", Warranty: "6 months seller" } }, 9, 2.2),
    mk(now, 5, { title: "Teff (Magna) — 40 quintal, Dutch auction", category: "Coffee & Grain", openingPrice: 520_000, sellerId: "u-tadesse", location: "Bahir Dar", quantity: 40, unit: "quintal", format: "dutch", dutchFloor: 420_000, dutchDropPerHour: 5_000, condition: "New",
      description: "White Magna teff from Gojjam. Price drops every hour until someone accepts.", specs: { Variety: "Magna (white)", Bags: "40 × 100 kg" } }, 0, 18),
    mk(now, 6, { title: "Massey Ferguson 375 Tractor", category: "Agriculture", openingPrice: 1_600_000, sellerId: "u-abebe", location: "Adama", depositRequired: 20_000,
      description: "75 HP, 4,200 hours, recently serviced, plough attachment included.", specs: { Power: "75 HP", Hours: "4,200" } }, 3, 48),
    mk(now, 7, { title: "Condominium 2BR — Ayat Site 4", category: "Property", openingPrice: 3_900_000, sellerId: "u-hana", location: "Addis Ababa", depositRequired: 100_000, condition: "Like new",
      description: "68 m², 3rd floor, title deed ready. Viewing by appointment.", specs: { Size: "68 m²", Floor: "3rd", Bedrooms: "2" } }, 2, 72),
    mk(now, 8, { title: "Office Furniture Lot — 20 desks, 40 chairs", category: "Home & Business", openingPrice: 140_000, sellerId: "u-abebe", location: "Addis Ababa", delivery: "both",
      description: "From office relocation in Bole. Good condition.", specs: { Desks: "20", Chairs: "40" } }, 5, 10),
    mk(now, 9, { title: "Wholesale: 500 cartons bottled water", category: "Wholesale", openingPrice: 110_000, sellerId: "u-new", location: "Hawassa", quantity: 500, unit: "cartons", moderation: "pending",
      description: "0.5L × 24 per carton, expiry 2027.", specs: { Pack: "24 × 0.5 L" } }, 0, 36),
    mk(now, 10, { title: "Bajaj RE Three-Wheeler 2022", category: "Vehicles", openingPrice: 380_000, sellerId: "u-new", location: "Dire Dawa", moderation: "flagged",
      description: "Runs well. Papers available.", specs: { Year: "2022" } }, 1, 20),
    mk(now, 11, { title: "Dell Latitude 5440 Laptops × 10", category: "Electronics", openingPrice: 520_000, sellerId: "u-abebe", location: "Addis Ababa", startsAt: now + 5 * H, condition: "New", quantity: 10, unit: "pieces",
      description: "Sealed boxes, i5 13th gen, 16GB RAM.", specs: { CPU: "i5-1345U", RAM: "16 GB" } }, 0, 54),
    mk(now, 12, { title: "Horro Sheep flock — 25 head", category: "Livestock", openingPrice: 175_000, sellerId: "u-tadesse", location: "Gondar", quantity: 25, unit: "head", endsAt: now - 2 * H, soldTo: ME,
      description: "Mixed ages, healthy flock.", specs: { Breed: "Horro" } }, 6, -2),
  ];
}

export function seedNotifications(now: number): Notification[] {
  return [
    { id: "n1", kind: "outbid", title: "You were outbid", body: "Someone bid 4,350,000 ETB on Toyota Hilux 2019.", at: now - 0.3 * H, read: false, listingId: "l-1" },
    { id: "n2", kind: "ending", title: "Ending soon", body: "Boran Bull auction ends in under 1 hour.", at: now - 1 * H, read: false, listingId: "l-3" },
    { id: "n3", kind: "won", title: "You won!", body: "You won Horro Sheep flock. Contact the seller to arrange pickup.", at: now - 2 * H, read: false, listingId: "l-12" },
    { id: "n4", kind: "sold", title: "Item sold", body: "Your listing 'Used Sofa set' sold for 32,000 ETB.", at: now - 26 * H, read: true },
    { id: "n5", kind: "system", title: "Demo Mode", body: "No real payments or SMS are sent in this prototype.", at: now - 48 * H, read: true },
  ];
}

export const seedDeposits = (now: number): Deposit[] => [
  { id: "d1", listingId: "l-1", amount: 50_000, status: "held", updatedAt: now - 3 * H, attempts: 1 },
  { id: "d2", listingId: "l-12", amount: 10_000, status: "applied_to_winner", updatedAt: now - 2 * H, attempts: 1 },
  { id: "d3", listingId: "l-7", amount: 100_000, status: "pending", updatedAt: now - 0.2 * H, attempts: 1 },
  { id: "d4", listingId: "l-6", amount: 20_000, status: "released", updatedAt: now - 50 * H, attempts: 2 },
];

export const seedTokenTx = (now: number): TokenTx[] => [
  { id: "t1", label: "Starter pack (demo)", delta: 20, at: now - 72 * H, demo: true },
  { id: "t2", label: "Bid on Toyota Hilux", delta: -1, at: now - 3 * H, demo: true },
  { id: "t3", label: "Bid on Horro Sheep", delta: -1, at: now - 8 * H, demo: true },
];

export const TOKEN_PACKAGES = [
  { id: "p1", name: "Starter", tokens: 10, price: 100 },
  { id: "p2", name: "Trader", tokens: 50, price: 450, popular: true },
  { id: "p3", name: "Business", tokens: 200, price: 1600 },
];