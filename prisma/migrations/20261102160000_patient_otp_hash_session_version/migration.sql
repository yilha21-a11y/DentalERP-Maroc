-- Sécurité portail patient : OTP haché, limite par IP, révocation des sessions.
-- ATTENTION : les OTP en clair existants sont supprimés (ils expirent en 5 minutes).
DELETE FROM `PatientOTP`;

ALTER TABLE `PatientOTP` DROP COLUMN `otp`,
    ADD COLUMN `otpHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `ipAddress` VARCHAR(191) NULL;

CREATE INDEX `PatientOTP_ipAddress_createdAt_idx` ON `PatientOTP`(`ipAddress`, `createdAt`);

ALTER TABLE `Patient` ADD COLUMN `portalSessionVersion` INTEGER NOT NULL DEFAULT 0;
