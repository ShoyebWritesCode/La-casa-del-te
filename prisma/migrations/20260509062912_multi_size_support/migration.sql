/*
  Warnings:

  - The `available_grams` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_images" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "recommended_grams" INTEGER,
ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "available_grams",
ADD COLUMN     "available_grams" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ALTER COLUMN "updated_at" DROP DEFAULT;
