-- DentalERP Maroc - operational modules
-- MySQL migration intentionally additive to preserve upstream compatibility.

ALTER TABLE `Hospital`
  MODIFY `locale` VARCHAR(191) NOT NULL DEFAULT 'fr-MA',
  MODIFY `country` VARCHAR(191) NOT NULL DEFAULT 'MA',
  MODIFY `currency` VARCHAR(191) NOT NULL DEFAULT 'MAD',
  MODIFY `timezone` VARCHAR(191) NOT NULL DEFAULT 'Africa/Casablanca';

ALTER TABLE `Patient`
  MODIFY `state` VARCHAR(191) NULL;

ALTER TABLE `User`
  MODIFY `role` ENUM('ADMIN','DOCTOR','ASSISTANT','RECEPTIONIST','LAB_TECH','ACCOUNTANT') NOT NULL DEFAULT 'RECEPTIONIST';

ALTER TABLE `StaffInvite`
  MODIFY `role` ENUM('ADMIN','DOCTOR','ASSISTANT','RECEPTIONIST','LAB_TECH','ACCOUNTANT') NOT NULL;

CREATE TABLE `RolePermission` (
  `id` VARCHAR(191) NOT NULL,
  `hospitalId` VARCHAR(191) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `permission` VARCHAR(100) NOT NULL,
  `allowed` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `RolePermission_hospital_role_permission_key` (`hospitalId`,`role`,`permission`),
  KEY `RolePermission_hospitalId_idx` (`hospitalId`),
  CONSTRAINT `RolePermission_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InternalConversation` (
  `id` VARCHAR(191) NOT NULL,
  `hospitalId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `isGroup` BOOLEAN NOT NULL DEFAULT FALSE,
  `isBroadcast` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `InternalConversation_hospitalId_idx` (`hospitalId`),
  CONSTRAINT `InternalConversation_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InternalConversationMember` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `lastReadAt` DATETIME(3) NULL,
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ConversationMember_conversation_user_key` (`conversationId`,`userId`),
  KEY `ConversationMember_userId_idx` (`userId`),
  CONSTRAINT `ConversationMember_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `InternalConversation`(`id`) ON DELETE CASCADE,
  CONSTRAINT `ConversationMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InternalMessage` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `attachmentUrl` TEXT NULL,
  `isUrgent` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `InternalMessage_conversation_created_idx` (`conversationId`,`createdAt`),
  CONSTRAINT `InternalMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `InternalConversation`(`id`) ON DELETE CASCADE,
  CONSTRAINT `InternalMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WaitingRoomEntry` (
  `id` VARCHAR(191) NOT NULL,
  `hospitalId` VARCHAR(191) NOT NULL,
  `appointmentId` VARCHAR(191) NOT NULL,
  `status` ENUM('WAITING','CALLED','IN_CONSULTATION','COMPLETED','CANCELLED') NOT NULL DEFAULT 'WAITING',
  `roomLabel` VARCHAR(100) NULL,
  `arrivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `calledAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `WaitingRoomEntry_appointmentId_key` (`appointmentId`),
  KEY `WaitingRoomEntry_hospital_status_idx` (`hospitalId`,`status`),
  CONSTRAINT `WaitingRoomEntry_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE,
  CONSTRAINT `WaitingRoomEntry_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReceptionCharge` (
  `id` VARCHAR(191) NOT NULL,
  `hospitalId` VARCHAR(191) NOT NULL,
  `patientId` VARCHAR(191) NOT NULL,
  `treatmentId` VARCHAR(191) NULL,
  `doctorId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `amountPaid` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` ENUM('PENDING','PARTIAL','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `notes` TEXT NULL,
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ReceptionCharge_hospital_status_idx` (`hospitalId`,`status`),
  KEY `ReceptionCharge_doctor_idx` (`doctorId`,`sentAt`),
  CONSTRAINT `ReceptionCharge_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE,
  CONSTRAINT `ReceptionCharge_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`),
  CONSTRAINT `ReceptionCharge_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE SET NULL,
  CONSTRAINT `ReceptionCharge_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Staff`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhatsAppLog` (
  `id` VARCHAR(191) NOT NULL,
  `hospitalId` VARCHAR(191) NOT NULL,
  `patientId` VARCHAR(191) NULL,
  `appointmentId` VARCHAR(191) NULL,
  `phone` VARCHAR(40) NOT NULL,
  `templateName` VARCHAR(191) NULL,
  `messageType` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  `providerMessageId` VARCHAR(191) NULL,
  `errorMessage` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `WhatsAppLog_hospital_created_idx` (`hospitalId`,`createdAt`),
  CONSTRAINT `WhatsAppLog_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE,
  CONSTRAINT `WhatsAppLog_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE SET NULL,
  CONSTRAINT `WhatsAppLog_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
