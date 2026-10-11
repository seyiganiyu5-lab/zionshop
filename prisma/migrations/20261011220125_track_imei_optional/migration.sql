-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "trackImei" BOOLEAN NOT NULL DEFAULT true;

-- Accessories have always been counted by quantity.
UPDATE "Product" SET "trackImei" = false WHERE "category" = 'ACCESSORY';
