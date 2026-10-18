import { PrismaClient, UserRole, UserStatus, AuctionStatus, AuctionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding BidEthiopia database...");

  // Clean existing data
  await prisma.auditEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bid.deleteMany({});
  await prisma.auction.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      fullName: "Abebe Admin",
      phone: "+251911234567",
      email: "admin@bidethiopia.com",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      preferredLanguage: "am",
    },
  });

  const sellerCoffee = await prisma.user.create({
    data: {
      fullName: "Jimma Coffee Union",
      phone: "+251917222333",
      email: "jimma.coffee@example.com",
      passwordHash,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      preferredLanguage: "om",
    },
  });

  const sellerVehicles = await prisma.user.create({
    data: {
      fullName: "Hana Motors PLC",
      phone: "+251913444555",
      email: "hana.motors@example.com",
      passwordHash,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      preferredLanguage: "am",
    },
  });

  const buyer = await prisma.user.create({
    data: {
      fullName: "Selam Tesfaye",
      phone: "+251912000111",
      email: "selam.buyer@example.com",
      passwordHash,
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      preferredLanguage: "en",
    },
  });

  console.log("Users created:", { admin: admin.phone, sellerCoffee: sellerCoffee.phone, buyer: buyer.phone });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const twoDaysLater = new Date(now.getTime() + 2 * 86400000);
  const fiveDaysLater = new Date(now.getTime() + 5 * 86400000);

  // 2. Create Auctions
  const auction1 = await prisma.auction.create({
    data: {
      sellerId: sellerCoffee.id,
      title: "Grade 1 Yirgacheffe Washed Coffee (10 Quintals)",
      description: "Direct from Gedeo zone smallholders. Certified export grade washed Arabica coffee. Moisture content 11%, defect count under 5. Packaged in GrainPro lined bags.",
      category: "Coffee & Grain",
      condition: "New crop 2026",
      region: "SNNPR / Sidama",
      city: "Yirgacheffe",
      imageUrls: ["/src/assets/coffee.jpg"],
      type: AuctionType.ASCENDING,
      status: AuctionStatus.LIVE,
      currency: "ETB",
      startingPrice: 320000.00,
      currentPrice: 345000.00,
      minimumIncrement: 5000.00,
      startsAt: oneHourAgo,
      endsAt: twoDaysLater,
    },
  });

  const auction2 = await prisma.auction.create({
    data: {
      sellerId: sellerVehicles.id,
      title: "2022 Toyota Hilux Double Cab 4x4",
      description: "Low mileage (38,000 km), diesel engine 2.8L GD-6. Clean customs clearance, fully serviced by authorized dealer in Addis Ababa. Includes winch and canopy.",
      category: "Vehicles",
      condition: "Used - excellent",
      region: "Addis Ababa",
      city: "Bole",
      imageUrls: ["/src/assets/vehicle.jpg"],
      type: AuctionType.ASCENDING,
      status: AuctionStatus.LIVE,
      currency: "ETB",
      startingPrice: 5800000.00,
      currentPrice: 6150000.00,
      minimumIncrement: 50000.00,
      startsAt: oneHourAgo,
      endsAt: fiveDaysLater,
    },
  });

  const auction3 = await prisma.auction.create({
    data: {
      sellerId: sellerCoffee.id,
      title: "Purebred Boran Bulls (Batch of 5)",
      description: "Selected Boran breeding bulls from Adama fattening center. Average weight 420 kg each, veterinary certificates and vaccination passports up to date.",
      category: "Livestock",
      condition: "Healthy prime stock",
      region: "Oromia",
      city: "Adama",
      imageUrls: ["/src/assets/livestock.jpg"],
      type: AuctionType.ASCENDING,
      status: AuctionStatus.LIVE,
      currency: "ETB",
      startingPrice: 450000.00,
      currentPrice: 470000.00,
      minimumIncrement: 10000.00,
      startsAt: oneHourAgo,
      endsAt: twoDaysLater,
    },
  });

  const auction4 = await prisma.auction.create({
    data: {
      sellerId: sellerVehicles.id,
      title: "Apple MacBook Pro 16\" M3 Max + Studio Display",
      description: "64GB Unified RAM, 1TB SSD, Space Black. Brand new in sealed box with 1-year international warranty. Shipped via Ethiopian Airlines cargo.",
      category: "Electronics",
      condition: "Brand new - sealed",
      region: "Addis Ababa",
      city: "Kazanchis",
      imageUrls: ["/src/assets/electronics.jpg"],
      type: AuctionType.ASCENDING,
      status: AuctionStatus.LIVE,
      currency: "ETB",
      startingPrice: 380000.00,
      currentPrice: 395000.00,
      minimumIncrement: 5000.00,
      startsAt: oneHourAgo,
      endsAt: twoDaysLater,
    },
  });

  // 3. Create Sample Bids
  await prisma.bid.create({
    data: {
      auctionId: auction1.id,
      bidderId: buyer.id,
      amount: 335000.00,
      status: "OUTBID",
      createdAt: new Date(now.getTime() - 1800000),
    },
  });

  await prisma.bid.create({
    data: {
      auctionId: auction1.id,
      bidderId: admin.id,
      amount: 345000.00,
      status: "WINNING",
      createdAt: new Date(now.getTime() - 600000),
    },
  });

  await prisma.bid.create({
    data: {
      auctionId: auction2.id,
      bidderId: buyer.id,
      amount: 6150000.00,
      status: "WINNING",
      createdAt: new Date(now.getTime() - 1200000),
    },
  });

  // 4. Create Initial Audit Events
  await prisma.auditEvent.createMany({
    data: [
      {
        actorId: admin.id,
        action: "SYSTEM_INITIALIZED",
        entityType: "System",
        entityId: "system",
        metadata: { message: "BidEthiopia system initialized and seeded with demo Ethiopian marketplace data." },
      },
      {
        actorId: sellerCoffee.id,
        action: "AUCTION_CREATED",
        entityType: "Auction",
        entityId: auction1.id,
        metadata: { title: auction1.title },
      },
      {
        actorId: buyer.id,
        action: "BID_PLACED",
        entityType: "Bid",
        entityId: auction1.id,
        metadata: { amount: 335000 },
      },
    ],
  });

  console.log("Database seeded successfully with 4 live auctions and users!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
