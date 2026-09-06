/*
  Warnings:

  - You are about to drop the column `ambientTemperature` on the `EnvironmentReading` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EnvironmentReading" DROP COLUMN "ambientTemperature",
ADD COLUMN     "temperature" DOUBLE PRECISION;
