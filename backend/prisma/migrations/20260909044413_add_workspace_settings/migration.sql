-- CreateTable
CREATE TABLE `workspace_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyName` VARCHAR(191) NOT NULL DEFAULT '',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Jakarta',
    `language` VARCHAR(191) NOT NULL DEFAULT 'id',
    `defaultSenderId` VARCHAR(191) NULL,
    `rateLimitPerMin` INTEGER NOT NULL DEFAULT 60,
    `retryLimit` INTEGER NOT NULL DEFAULT 3,
    `delayBetweenMs` INTEGER NOT NULL DEFAULT 500,
    `notifyCampaignCompleted` BOOLEAN NOT NULL DEFAULT true,
    `notifyCampaignFailed` BOOLEAN NOT NULL DEFAULT true,
    `notifyConnectionError` BOOLEAN NOT NULL DEFAULT true,
    `notifyLowQuota` BOOLEAN NOT NULL DEFAULT true,
    `messageQuota` INTEGER NOT NULL DEFAULT 100000,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
