-- AlterTable
ALTER TABLE `whatsapp_messages` ADD COLUMN `campaignId` INTEGER NULL;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `whatsappAccountId` VARCHAR(191) NOT NULL,
    `templateId` INTEGER NULL,
    `templateContentSnapshot` VARCHAR(191) NOT NULL,
    `mediaPath` VARCHAR(191) NULL,
    `mediaType` VARCHAR(191) NULL,
    `mediaName` VARCHAR(191) NULL,
    `mediaMimetype` VARCHAR(191) NULL,
    `mediaSize` INTEGER NULL,
    `scheduledAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `pausedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `recipientsCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `campaigns_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `campaigns_whatsappAccountId_idx`(`whatsappAccountId`),
    INDEX `campaigns_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_targets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaignId` INTEGER NOT NULL,

    UNIQUE INDEX `campaign_targets_campaignId_key`(`campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `targetsId` INTEGER NOT NULL,
    `contactId` INTEGER NULL,

    INDEX `campaign_contacts_targetsId_idx`(`targetsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `targetsId` INTEGER NOT NULL,
    `groupId` INTEGER NULL,
    `groupName` VARCHAR(191) NOT NULL,

    INDEX `campaign_groups_targetsId_idx`(`targetsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_recipients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaignId` INTEGER NOT NULL,
    `contactId` INTEGER NULL,
    `phone` VARCHAR(191) NOT NULL,
    `variablesSnapshot` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `messageId` VARCHAR(191) NULL,
    `skipReason` VARCHAR(191) NULL,
    `queuedAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `skippedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `campaign_recipients_messageId_key`(`messageId`),
    INDEX `campaign_recipients_campaignId_status_idx`(`campaignId`, `status`),
    INDEX `campaign_recipients_contactId_idx`(`contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `whatsapp_messages_campaignId_idx` ON `whatsapp_messages`(`campaignId`);

-- AddForeignKey
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_whatsappAccountId_fkey` FOREIGN KEY (`whatsappAccountId`) REFERENCES `whatsapp_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_targets` ADD CONSTRAINT `campaign_targets_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_contacts` ADD CONSTRAINT `campaign_contacts_targetsId_fkey` FOREIGN KEY (`targetsId`) REFERENCES `campaign_targets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_contacts` ADD CONSTRAINT `campaign_contacts_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_groups` ADD CONSTRAINT `campaign_groups_targetsId_fkey` FOREIGN KEY (`targetsId`) REFERENCES `campaign_targets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_groups` ADD CONSTRAINT `campaign_groups_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_recipients` ADD CONSTRAINT `campaign_recipients_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_recipients` ADD CONSTRAINT `campaign_recipients_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_recipients` ADD CONSTRAINT `campaign_recipients_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `whatsapp_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
