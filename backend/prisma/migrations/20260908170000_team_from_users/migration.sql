-- AlterTable
ALTER TABLE `User` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    ADD COLUMN `lastLogin` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_status_idx` ON `User`(`status`);
