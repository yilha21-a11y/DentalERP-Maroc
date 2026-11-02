CREATE TABLE `RateLimitBucket` (
  `id` VARCHAR(191) NOT NULL,
  `keyHash` VARCHAR(191) NOT NULL,
  `count` INTEGER NOT NULL DEFAULT 1,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `RateLimitBucket_keyHash_key` (`keyHash`),
  KEY `RateLimitBucket_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
