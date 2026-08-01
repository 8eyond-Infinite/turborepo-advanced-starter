ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Existing accounts predate verification and must not be locked when the
-- deployment enables the policy after this migration.
UPDATE "users" SET "email_verified_at" = CURRENT_TIMESTAMP;

CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key"
ON "email_verification_tokens"("token_hash");

CREATE INDEX "email_verification_tokens_user_id_created_at_idx"
ON "email_verification_tokens"("user_id", "created_at");

CREATE INDEX "email_verification_tokens_expires_at_idx"
ON "email_verification_tokens"("expires_at");

ALTER TABLE "email_verification_tokens"
ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
