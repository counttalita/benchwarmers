-- CreateEnum
CREATE TYPE "public"."CompanyType" AS ENUM ('provider', 'seeker', 'both');

-- CreateEnum
CREATE TYPE "public"."CompanyStatus" AS ENUM ('pending', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "public"."SeniorityLevel" AS ENUM ('junior', 'mid', 'senior', 'lead', 'principal');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('pending', 'held_in_escrow', 'released', 'refunded');

-- CreateEnum
CREATE TYPE "public"."EngagementStatus" AS ENUM ('active', 'completed', 'terminated', 'disputed');

-- CreateEnum
CREATE TYPE "public"."OfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'countered');

-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('pending', 'viewed', 'interested', 'not_interested');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('open', 'matching', 'closed');

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "type" "public"."CompanyType" NOT NULL,
    "status" "public"."CompanyStatus" NOT NULL DEFAULT 'pending',
    "stripe_account_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "domain_verified" BOOLEAN NOT NULL DEFAULT false,
    "domain_verification_token" TEXT,
    "domain_verified_at" TIMESTAMP(3),
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otp_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."talent_profiles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seniority_level" "public"."SeniorityLevel" NOT NULL,
    "skills" JSONB NOT NULL,
    "certifications" JSONB,
    "location" TEXT NOT NULL,
    "remote_preference" TEXT NOT NULL,
    "rate_min" DECIMAL(10,2),
    "rate_max" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "availability_calendar" JSONB,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."talent_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required_skills" JSONB NOT NULL,
    "preferred_skills" JSONB,
    "budget_min" DECIMAL(10,2),
    "budget_max" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "start_date" TIMESTAMP(3) NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "location_preference" TEXT NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."matches" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "score_breakdown" JSONB NOT NULL,
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."offers" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "seeker_company_id" TEXT NOT NULL,
    "provider_company_id" TEXT NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "start_date" TIMESTAMP(3) NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "terms" TEXT,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "platform_fee" DECIMAL(10,2) NOT NULL,
    "provider_amount" DECIMAL(10,2) NOT NULL,
    "status" "public"."OfferStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "platform_fee_amount" DECIMAL(10,2) NOT NULL,
    "provider_amount" DECIMAL(10,2) NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "held_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."engagements" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "status" "public"."EngagementStatus" NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "total_hours" DECIMAL(8,2),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "completion_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_domain_key" ON "public"."companies"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "companies_domain_verification_token_key" ON "public"."companies"("domain_verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "public"."users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "public"."payments"("stripe_payment_intent_id");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."talent_profiles" ADD CONSTRAINT "talent_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."talent_requests" ADD CONSTRAINT "talent_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."talent_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."talent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_seeker_company_id_fkey" FOREIGN KEY ("seeker_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."offers" ADD CONSTRAINT "offers_provider_company_id_fkey" FOREIGN KEY ("provider_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."engagements" ADD CONSTRAINT "engagements_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."talent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
