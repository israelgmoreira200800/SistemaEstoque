-- DropForeignKey
ALTER TABLE "customer_order_items" DROP CONSTRAINT "customer_order_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_order_items" DROP CONSTRAINT "customer_order_items_order_id_fkey";

-- DropForeignKey
ALTER TABLE "item_unit_conversions" DROP CONSTRAINT "item_unit_conversions_item_id_fkey";

-- DropForeignKey
ALTER TABLE "item_unit_conversions" DROP CONSTRAINT "item_unit_conversions_source_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_category_id_fkey";

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "product_components" DROP CONSTRAINT "product_components_component_item_id_fkey";

-- DropForeignKey
ALTER TABLE "product_components" DROP CONSTRAINT "product_components_product_id_fkey";

-- DropForeignKey
ALTER TABLE "productions" DROP CONSTRAINT "productions_product_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_adjustment_requests" DROP CONSTRAINT "stock_adjustment_requests_item_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_balances" DROP CONSTRAINT "stock_balances_item_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_item_id_fkey";

-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "module" DROP DEFAULT,
ALTER COLUMN "action" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "customer_orders_company_id_id_key" ON "customer_orders"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "item_categories_company_id_id_key" ON "item_categories"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "items_company_id_id_key" ON "items"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_company_id_id_key" ON "roles"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_company_id_id_key" ON "sectors"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_company_id_id_key" ON "stock_movements"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "units_company_id_id_key" ON "units"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_id_key" ON "users"("company_id", "id");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_unit_id_fkey" FOREIGN KEY ("company_id", "unit_id") REFERENCES "units"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_category_id_fkey" FOREIGN KEY ("company_id", "category_id") REFERENCES "item_categories"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_unit_conversions" ADD CONSTRAINT "item_unit_conversions_company_id_item_id_fkey" FOREIGN KEY ("company_id", "item_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_unit_conversions" ADD CONSTRAINT "item_unit_conversions_company_id_source_unit_id_fkey" FOREIGN KEY ("company_id", "source_unit_id") REFERENCES "units"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_company_id_item_id_fkey" FOREIGN KEY ("company_id", "item_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_item_id_fkey" FOREIGN KEY ("company_id", "item_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_company_id_item_id_fkey" FOREIGN KEY ("company_id", "item_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_company_id_product_id_fkey" FOREIGN KEY ("company_id", "product_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_company_id_component_item_id_fkey" FOREIGN KEY ("company_id", "component_item_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productions" ADD CONSTRAINT "productions_company_id_product_id_fkey" FOREIGN KEY ("company_id", "product_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order_items" ADD CONSTRAINT "customer_order_items_company_id_order_id_fkey" FOREIGN KEY ("company_id", "order_id") REFERENCES "customer_orders"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order_items" ADD CONSTRAINT "customer_order_items_company_id_item_id_fkey" FOREIGN KEY ("company_id", "item_id") REFERENCES "items"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
