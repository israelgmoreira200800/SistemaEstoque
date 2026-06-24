-- SaaS domain preparation: tenant lifecycle, platform operators and manual plan structure.

-- Replace CompanyStatus while preserving existing rows.
ALTER TYPE "CompanyStatus" RENAME TO "CompanyStatus_old";
CREATE TYPE "CompanyStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

ALTER TABLE "companies" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "companies" ALTER COLUMN "status" TYPE "CompanyStatus" USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'ACTIVE'::"CompanyStatus"
    WHEN 'INACTIVE' THEN 'SUSPENDED'::"CompanyStatus"
    ELSE 'ACTIVE'::"CompanyStatus"
  END
);
ALTER TABLE "companies" ALTER COLUMN "status" SET DEFAULT 'TRIAL';
DROP TYPE "CompanyStatus_old";

CREATE TYPE "PlatformUserStatus" AS ENUM ('ACTIVE', 'BLOCKED');
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'SUPPORT');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

ALTER TABLE "companies" ADD COLUMN "legal_name" TEXT;
ALTER TABLE "companies" ADD COLUMN "trade_name" TEXT;
ALTER TABLE "companies" ADD COLUMN "document" TEXT;
ALTER TABLE "companies" ADD COLUMN "email" TEXT;
ALTER TABLE "companies" ADD COLUMN "phone" TEXT;
ALTER TABLE "companies" ADD COLUMN "plan_id" TEXT;
ALTER TABLE "companies" ADD COLUMN "trial_started_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "activated_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "suspended_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "suspension_reason" TEXT;
ALTER TABLE "companies" ADD COLUMN "cancellation_reason" TEXT;

CREATE TABLE "platform_users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "status" "PlatformUserStatus" NOT NULL DEFAULT 'ACTIVE',
  "role" "PlatformRole" NOT NULL DEFAULT 'OPERATOR',
  "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMP(3),
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_sessions" (
  "id" TEXT NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "platform_user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_audit_logs" (
  "id" TEXT NOT NULL,
  "platform_user_id" TEXT,
  "company_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "request_id" TEXT,
  "ip_address" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "monthly_price_cents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "trial_days" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_features" (
  "id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "value" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trial_started_at" TIMESTAMP(3),
  "trial_ends_at" TIMESTAMP(3),
  "current_period_started_at" TIMESTAMP(3),
  "current_period_ends_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_limits" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "key" TEXT NOT NULL,
  "limit_value" INTEGER,
  "used_value" INTEGER NOT NULL DEFAULT 0,
  "unit" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "usage_limits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_events" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "type" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");
CREATE INDEX "platform_users_status_name_idx" ON "platform_users"("status", "name");

CREATE UNIQUE INDEX "platform_sessions_token_hash_key" ON "platform_sessions"("token_hash");
CREATE INDEX "platform_sessions_platform_user_id_expires_at_idx" ON "platform_sessions"("platform_user_id", "expires_at");

CREATE INDEX "platform_audit_logs_platform_user_id_created_at_idx" ON "platform_audit_logs"("platform_user_id", "created_at");
CREATE INDEX "platform_audit_logs_company_id_created_at_idx" ON "platform_audit_logs"("company_id", "created_at");
CREATE INDEX "platform_audit_logs_entity_type_entity_id_idx" ON "platform_audit_logs"("entity_type", "entity_id");

CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");
CREATE INDEX "plans_status_name_idx" ON "plans"("status", "name");

CREATE UNIQUE INDEX "plan_features_plan_id_key_key" ON "plan_features"("plan_id", "key");

CREATE INDEX "subscriptions_company_id_status_idx" ON "subscriptions"("company_id", "status");
CREATE INDEX "subscriptions_plan_id_status_idx" ON "subscriptions"("plan_id", "status");

CREATE UNIQUE INDEX "usage_limits_company_id_key_key" ON "usage_limits"("company_id", "key");
CREATE INDEX "usage_limits_subscription_id_idx" ON "usage_limits"("subscription_id");

CREATE INDEX "billing_events_company_id_occurred_at_idx" ON "billing_events"("company_id", "occurred_at");
CREATE INDEX "billing_events_subscription_id_idx" ON "billing_events"("subscription_id");

CREATE INDEX "companies_status_created_at_idx" ON "companies"("status", "created_at");
CREATE INDEX "companies_plan_id_idx" ON "companies"("plan_id");
CREATE INDEX "companies_document_idx" ON "companies"("document");

ALTER TABLE "companies" ADD CONSTRAINT "companies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
