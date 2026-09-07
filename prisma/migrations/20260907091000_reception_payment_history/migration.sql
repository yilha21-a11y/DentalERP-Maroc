CREATE TABLE `ReceptionPayment` (
  `id` VARCHAR(191) NOT NULL,
  `hospitalId` VARCHAR(191) NOT NULL,
  `chargeId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` ENUM('CASH','CARD','BANK_TRANSFER','CHEQUE','OTHER') NOT NULL DEFAULT 'CASH',
  `reference` VARCHAR(191) NULL,
  `receivedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ReceptionPayment_charge_created_idx` (`chargeId`,`createdAt`),
  KEY `ReceptionPayment_hospital_created_idx` (`hospitalId`,`createdAt`),
  CONSTRAINT `ReceptionPayment_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE,
  CONSTRAINT `ReceptionPayment_chargeId_fkey` FOREIGN KEY (`chargeId`) REFERENCES `ReceptionCharge`(`id`) ON DELETE CASCADE,
  CONSTRAINT `ReceptionPayment_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `User`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
