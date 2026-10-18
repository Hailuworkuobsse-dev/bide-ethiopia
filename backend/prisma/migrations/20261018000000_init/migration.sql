CREATE TABLE `User` (
  `id` VARCHAR(30) NOT NULL,
  `fullName` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(20) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` ENUM('BUYER','SELLER','ADMIN') NOT NULL DEFAULT 'BUYER',
  `status` ENUM('ACTIVE','SUSPENDED','PENDING_VERIFICATION') NOT NULL DEFAULT 'PENDING_VERIFICATION',
  `preferredLanguage` VARCHAR(8) NOT NULL DEFAULT 'am',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_email_key`(`email`),
  UNIQUE INDEX `User_phone_key`(`phone`),
  INDEX `User_role_status_idx`(`role`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Auction` (
  `id` VARCHAR(30) NOT NULL,
  `sellerId` VARCHAR(30) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `condition` VARCHAR(40) NULL,
  `region` VARCHAR(80) NOT NULL,
  `city` VARCHAR(80) NOT NULL,
  `imageUrls` JSON NULL,
  `type` ENUM('ASCENDING','DESCENDING') NOT NULL DEFAULT 'ASCENDING',
  `status` ENUM('DRAFT','SCHEDULED','LIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `currency` VARCHAR(3) NOT NULL DEFAULT 'ETB',
  `startingPrice` DECIMAL(14,2) NOT NULL,
  `currentPrice` DECIMAL(14,2) NOT NULL,
  `minimumIncrement` DECIMAL(14,2) NOT NULL DEFAULT 1.00,
  `reservePrice` DECIMAL(14,2) NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `endsAt` DATETIME(3) NOT NULL,
  `winnerId` VARCHAR(30) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Auction_status_category_region_idx`(`status`, `category`, `region`),
  INDEX `Auction_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
  INDEX `Auction_sellerId_createdAt_idx`(`sellerId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Auction_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Bid` (
  `id` VARCHAR(30) NOT NULL,
  `auctionId` VARCHAR(30) NOT NULL,
  `bidderId` VARCHAR(30) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `status` ENUM('ACCEPTED','OUTBID','WINNING','REJECTED') NOT NULL DEFAULT 'ACCEPTED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Bid_auctionId_amount_idx`(`auctionId`, `amount`),
  INDEX `Bid_bidderId_createdAt_idx`(`bidderId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Bid_auctionId_fkey` FOREIGN KEY (`auctionId`) REFERENCES `Auction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Bid_bidderId_fkey` FOREIGN KEY (`bidderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` VARCHAR(30) NOT NULL,
  `userId` VARCHAR(30) NOT NULL,
  `auctionId` VARCHAR(30) NOT NULL,
  `provider` ENUM('TELEBIRR','CBE_BIRR','MANUAL') NOT NULL,
  `status` ENUM('INITIATED','PENDING','PAID','FAILED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'INITIATED',
  `amount` DECIMAL(14,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'ETB',
  `providerReference` VARCHAR(191) NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `providerPayload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Payment_providerReference_key`(`providerReference`),
  UNIQUE INDEX `Payment_idempotencyKey_key`(`idempotencyKey`),
  INDEX `Payment_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Payment_auctionId_fkey` FOREIGN KEY (`auctionId`) REFERENCES `Auction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditEvent` (
  `id` VARCHAR(30) NOT NULL,
  `actorId` VARCHAR(30) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entityType` VARCHAR(80) NOT NULL,
  `entityId` VARCHAR(30) NULL,
  `ipAddress` VARCHAR(45) NULL,
  `userAgent` VARCHAR(255) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuditEvent_createdAt_idx`(`createdAt`),
  INDEX `AuditEvent_actorId_createdAt_idx`(`actorId`, `createdAt`),
  INDEX `AuditEvent_entityType_entityId_idx`(`entityType`, `entityId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AuditEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
