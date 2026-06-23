-- Single company MVP with advanced RBAC, sectors and single-stock operation.

-- CreateEnum safely
DO $$ BEGIN
  CREATE TYPE "PermissionOverrideEffect" AS ENUM ('GRANT', 'DENY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'EXIT', 'LOSS', 'ADJUSTMENT', 'INVENTORY', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'ORDER_RESERVATION', 'SHIPMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductionStatus" AS ENUM ('COMPLETED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerOrderStatus" AS ENUM ('OPEN', 'APPROVED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Users now belong directly to the single installation company.
ALTER TABLE "users" ADD COLUMN "company_id" TEXT;

UPDATE "users"
SET "company_id" = COALESCE(
  (
    SELECT "company_users"."company_id"
    FROM "company_users"
    WHERE "company_users"."user_id" = "users"."id"
    ORDER BY "company_users"."created_at" ASC
    LIMIT 1
  ),
  (SELECT "companies"."id" FROM "companies" ORDER BY "companies"."created_at" ASC LIMIT 1)
);

ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL;

CREATE INDEX "users_company_id_status_name_idx" ON "users"("company_id", "status", "name");
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Roles can be inactivated.
ALTER TABLE "roles" ADD COLUMN "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE';
DROP INDEX IF EXISTS "roles_company_id_name_idx";
CREATE INDEX "roles_company_id_status_name_idx" ON "roles"("company_id", "status", "name");

-- Permission catalog gets module/action metadata.
ALTER TABLE "permissions" ADD COLUMN "module" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "permissions" ADD COLUMN "action" TEXT NOT NULL DEFAULT 'legacy';
UPDATE "permissions"
SET
  "module" = split_part("key", '.', 1),
  "action" = CASE
    WHEN position('.' in "key") > 0 THEN substring("key" from position('.' in "key") + 1)
    ELSE "key"
  END;
CREATE INDEX "permissions_module_action_idx" ON "permissions"("module", "action");

-- Sessions point to the company directly instead of company_users.
ALTER TABLE "sessions" ADD COLUMN "company_id" TEXT;
UPDATE "sessions"
SET "company_id" = COALESCE(
  (
    SELECT "company_users"."company_id"
    FROM "company_users"
    WHERE "company_users"."id" = "sessions"."company_user_id"
    LIMIT 1
  ),
  (
    SELECT "users"."company_id"
    FROM "users"
    WHERE "users"."id" = "sessions"."user_id"
    LIMIT 1
  )
);
ALTER TABLE "sessions" ALTER COLUMN "company_id" SET NOT NULL;
CREATE INDEX "sessions_company_id_expires_at_idx" ON "sessions"("company_id", "expires_at");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "sessions_company_user_id_expires_at_idx";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_company_user_id_fkey";
ALTER TABLE "sessions" DROP COLUMN "company_user_id";

-- New direct user role table, backfilled from company_user_roles.
CREATE TABLE "user_roles" (
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

INSERT INTO "user_roles" ("user_id", "role_id")
SELECT DISTINCT "company_users"."user_id", "company_user_roles"."role_id"
FROM "company_user_roles"
JOIN "company_users" ON "company_users"."id" = "company_user_roles"."company_user_id";

CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User-level permission overrides.
CREATE TABLE "user_permission_overrides" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  "effect" "PermissionOverrideEffect" NOT NULL,
  "reason" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_permission_overrides_user_id_permission_id_key" ON "user_permission_overrides"("user_id", "permission_id");
CREATE INDEX "user_permission_overrides_permission_id_effect_idx" ON "user_permission_overrides"("permission_id", "effect");
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Operational sectors.
CREATE TABLE "sectors" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sectors_company_id_name_key" ON "sectors"("company_id", "name");
CREATE INDEX "sectors_company_id_status_name_idx" ON "sectors"("company_id", "status", "name");
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_sectors" (
  "user_id" TEXT NOT NULL,
  "sector_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_sectors_pkey" PRIMARY KEY ("user_id", "sector_id")
);

CREATE INDEX "user_sectors_sector_id_idx" ON "user_sectors"("sector_id");
ALTER TABLE "user_sectors" ADD CONSTRAINT "user_sectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_sectors" ADD CONSTRAINT "user_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Item cost fields for cost-specific permissions.
ALTER TABLE "items" ADD COLUMN "cost" DECIMAL(18,6) NOT NULL DEFAULT 0;
ALTER TABLE "items" ADD COLUMN "sale_price" DECIMAL(18,6) NOT NULL DEFAULT 0;

-- Single-stock balances and immutable stock movements.
CREATE TABLE "stock_balances" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "quantity_on_hand" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "quantity_reserved" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "quantity_blocked" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_balances_item_id_key" ON "stock_balances"("item_id");
CREATE UNIQUE INDEX "stock_balances_company_id_item_id_key" ON "stock_balances"("company_id", "item_id");
CREATE INDEX "stock_balances_company_id_quantity_on_hand_idx" ON "stock_balances"("company_id", "quantity_on_hand");
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "stock_movements" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity" DECIMAL(18,6) NOT NULL,
  "balance_after" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "document_number" TEXT,
  "note" TEXT,
  "source_type" TEXT,
  "source_id" TEXT,
  "created_by_user_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_movements_company_id_created_at_idx" ON "stock_movements"("company_id", "created_at");
CREATE INDEX "stock_movements_company_id_item_id_created_at_idx" ON "stock_movements"("company_id", "item_id", "created_at");
CREATE INDEX "stock_movements_company_id_source_type_source_id_idx" ON "stock_movements"("company_id", "source_type", "source_id");
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recipes and production.
CREATE TABLE "product_components" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "component_item_id" TEXT NOT NULL,
  "quantity" DECIMAL(18,6) NOT NULL,
  "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_components_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_components_company_id_product_id_component_item_id_key" ON "product_components"("company_id", "product_id", "component_item_id");
CREATE INDEX "product_components_company_id_product_id_status_idx" ON "product_components"("company_id", "product_id", "status");
CREATE INDEX "product_components_company_id_component_item_id_idx" ON "product_components"("company_id", "component_item_id");
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_component_item_id_fkey" FOREIGN KEY ("component_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "productions" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "quantity" DECIMAL(18,6) NOT NULL,
  "status" "ProductionStatus" NOT NULL DEFAULT 'COMPLETED',
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "productions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "productions_company_id_created_at_idx" ON "productions"("company_id", "created_at");
CREATE INDEX "productions_company_id_product_id_idx" ON "productions"("company_id", "product_id");
ALTER TABLE "productions" ADD CONSTRAINT "productions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "productions" ADD CONSTRAINT "productions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "productions" ADD CONSTRAINT "productions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Orders.
CREATE TABLE "customer_orders" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "customer_name" TEXT,
  "document_number" TEXT,
  "status" "CustomerOrderStatus" NOT NULL DEFAULT 'OPEN',
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_orders_company_id_created_at_idx" ON "customer_orders"("company_id", "created_at");
CREATE INDEX "customer_orders_company_id_status_idx" ON "customer_orders"("company_id", "status");
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_order_items" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "quantity" DECIMAL(18,6) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_order_items_company_id_order_id_idx" ON "customer_order_items"("company_id", "order_id");
CREATE INDEX "customer_order_items_company_id_item_id_idx" ON "customer_order_items"("company_id", "item_id");
ALTER TABLE "customer_order_items" ADD CONSTRAINT "customer_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_order_items" ADD CONSTRAINT "customer_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Retire multi-branch/membership tables.
ALTER TABLE "company_user_roles" DROP CONSTRAINT IF EXISTS "company_user_roles_company_user_id_fkey";
ALTER TABLE "company_user_roles" DROP CONSTRAINT IF EXISTS "company_user_roles_role_id_fkey";
DROP TABLE IF EXISTS "company_user_roles";

ALTER TABLE "company_users" DROP CONSTRAINT IF EXISTS "company_users_company_id_fkey";
ALTER TABLE "company_users" DROP CONSTRAINT IF EXISTS "company_users_user_id_fkey";
DROP TABLE IF EXISTS "company_users";

ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "warehouses_company_id_fkey";
ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "warehouses_branch_id_fkey";
DROP TABLE IF EXISTS "warehouses";

ALTER TABLE "branches" DROP CONSTRAINT IF EXISTS "branches_company_id_fkey";
DROP TABLE IF EXISTS "branches";

DROP TYPE IF EXISTS "MembershipStatus";

