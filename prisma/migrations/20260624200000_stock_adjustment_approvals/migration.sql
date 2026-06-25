-- Stock adjustment and inventory approval workflow.

CREATE TYPE "StockAdjustmentKind" AS ENUM ('ADJUSTMENT', 'INVENTORY');
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');

CREATE TABLE "stock_adjustment_requests" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "kind" "StockAdjustmentKind" NOT NULL,
  "status" "StockAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
  "current_quantity" DECIMAL(18,6) NOT NULL,
  "requested_quantity" DECIMAL(18,6) NOT NULL,
  "applied_delta" DECIMAL(18,6),
  "document_number" TEXT,
  "reason" TEXT,
  "review_note" TEXT,
  "requested_by_user_id" TEXT,
  "reviewed_by_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "movement_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "stock_adjustment_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_adjustment_requests_movement_id_key" ON "stock_adjustment_requests"("movement_id");
CREATE INDEX "stock_adjustment_requests_company_id_status_created_at_idx" ON "stock_adjustment_requests"("company_id", "status", "created_at");
CREATE INDEX "stock_adjustment_requests_company_id_item_id_status_idx" ON "stock_adjustment_requests"("company_id", "item_id", "status");
CREATE INDEX "stock_adjustment_requests_requested_by_user_id_created_at_idx" ON "stock_adjustment_requests"("requested_by_user_id", "created_at");
CREATE INDEX "stock_adjustment_requests_reviewed_by_user_id_reviewed_at_idx" ON "stock_adjustment_requests"("reviewed_by_user_id", "reviewed_at");

ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
