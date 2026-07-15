-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "module" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "isDeleted" SET DEFAULT false;
