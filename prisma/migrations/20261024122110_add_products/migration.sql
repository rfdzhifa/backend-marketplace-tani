/*
  Warnings:

  - You are about to drop the column `farmer_profile_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `foto` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `is_deleted` on the `products` table. All the data in the column will be lost.
  - You are about to alter the column `nama` on the `products` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(150)`.
  - Added the required column `seller_id` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_farmer_profile_id_fkey`;

-- DropIndex
DROP INDEX `products_farmer_profile_id_fkey` ON `products`;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `farmer_profile_id`,
    DROP COLUMN `foto`,
    DROP COLUMN `is_deleted`,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `gambar_url` VARCHAR(255) NULL,
    ADD COLUMN `jumlah_ulasan` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `satuan` VARCHAR(30) NOT NULL DEFAULT 'kg',
    ADD COLUMN `seller_id` INTEGER NOT NULL,
    MODIFY `nama` VARCHAR(150) NOT NULL,
    MODIFY `stok` INTEGER NOT NULL DEFAULT 0,
    MODIFY `deskripsi` TEXT NULL,
    MODIFY `rating_rata_rata` DECIMAL(3, 2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `products_seller_id_idx` ON `products`(`seller_id`);

-- CreateIndex
CREATE INDEX `products_nama_idx` ON `products`(`nama`);

-- CreateIndex
CREATE INDEX `products_deleted_at_idx` ON `products`(`deleted_at`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
