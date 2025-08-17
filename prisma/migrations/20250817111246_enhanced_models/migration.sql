-- AlterTable
ALTER TABLE "public"."talent_profiles" ADD COLUMN     "experience" JSONB,
ADD COLUMN     "languages" JSONB,
ADD COLUMN     "pastProjects" JSONB,
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "public"."talent_requests" ADD COLUMN     "budget_ideal" DECIMAL(10,2),
ADD COLUMN     "company_size" TEXT,
ADD COLUMN     "custom_weights" JSONB,
ADD COLUMN     "hours_per_week" INTEGER,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "urgency" TEXT NOT NULL DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "companies_domain_idx" ON "public"."companies"("domain");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "public"."companies"("status");

-- CreateIndex
CREATE INDEX "companies_type_idx" ON "public"."companies"("type");

-- CreateIndex
CREATE INDEX "companies_domain_verified_idx" ON "public"."companies"("domain_verified");

-- CreateIndex
CREATE INDEX "talent_profiles_company_id_idx" ON "public"."talent_profiles"("company_id");

-- CreateIndex
CREATE INDEX "talent_profiles_seniority_level_idx" ON "public"."talent_profiles"("seniority_level");

-- CreateIndex
CREATE INDEX "talent_profiles_is_visible_idx" ON "public"."talent_profiles"("is_visible");

-- CreateIndex
CREATE INDEX "talent_profiles_rating_idx" ON "public"."talent_profiles"("rating");

-- CreateIndex
CREATE INDEX "talent_requests_company_id_idx" ON "public"."talent_requests"("company_id");

-- CreateIndex
CREATE INDEX "talent_requests_status_idx" ON "public"."talent_requests"("status");

-- CreateIndex
CREATE INDEX "talent_requests_start_date_idx" ON "public"."talent_requests"("start_date");

-- CreateIndex
CREATE INDEX "talent_requests_urgency_idx" ON "public"."talent_requests"("urgency");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "public"."users"("company_id");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "public"."users"("phone_number");

-- CreateIndex
CREATE INDEX "users_phone_verified_idx" ON "public"."users"("phone_verified");
