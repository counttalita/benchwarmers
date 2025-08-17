-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('match_created', 'offer_received', 'offer_accepted', 'offer_declined', 'payment_released', 'payment_held', 'engagement_started', 'engagement_completed', 'milestone_reached', 'dispute_created', 'dispute_resolved', 'system_alert');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('unread', 'read', 'archived');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('in_app', 'email', 'push');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "public"."ConversationType" AS ENUM ('direct', 'group', 'support');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('active', 'archived', 'closed');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('text', 'file', 'system', 'offer', 'contract');

-- CreateEnum
CREATE TYPE "public"."SenderType" AS ENUM ('user', 'system');

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'unread',
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'medium',
    "channels" "public"."NotificationChannel"[] DEFAULT ARRAY['in_app']::"public"."NotificationChannel"[],
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "scheduled_for" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT,
    "type" "public"."NotificationType" NOT NULL,
    "channels" "public"."NotificationChannel"[] DEFAULT ARRAY['in_app', 'email']::"public"."NotificationChannel"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "frequency" TEXT NOT NULL DEFAULT 'immediate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" TEXT NOT NULL,
    "participants" TEXT[],
    "type" "public"."ConversationType" NOT NULL,
    "subject" TEXT,
    "engagement_id" TEXT,
    "contract_id" TEXT,
    "offer_id" TEXT,
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_type" "public"."SenderType" NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "recipient_type" "public"."SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" "public"."MessageType" NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_company_id_idx" ON "public"."notifications"("company_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "public"."notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "public"."notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "public"."notifications"("created_at");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "public"."notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_company_id_idx" ON "public"."notification_preferences"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_type_key" ON "public"."notification_preferences"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_company_id_type_key" ON "public"."notification_preferences"("company_id", "type");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "public"."conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_type_idx" ON "public"."conversations"("type");

-- CreateIndex
CREATE INDEX "conversations_engagement_id_idx" ON "public"."conversations"("engagement_id");

-- CreateIndex
CREATE INDEX "conversations_contract_id_idx" ON "public"."conversations"("contract_id");

-- CreateIndex
CREATE INDEX "conversations_offer_id_idx" ON "public"."conversations"("offer_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "public"."messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "public"."messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_recipient_id_idx" ON "public"."messages"("recipient_id");

-- CreateIndex
CREATE INDEX "messages_message_type_idx" ON "public"."messages"("message_type");

-- CreateIndex
CREATE INDEX "messages_read_at_idx" ON "public"."messages"("read_at");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "public"."messages"("created_at");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
