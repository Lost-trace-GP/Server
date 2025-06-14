/*
  Warnings:

  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "contact_number" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone";
