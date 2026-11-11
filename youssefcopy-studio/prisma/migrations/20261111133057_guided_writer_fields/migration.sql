-- Additive only: new columns with defaults. Existing rows are kept untouched.
ALTER TABLE "Product" ADD COLUMN "links" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CampaignEmail" ADD COLUMN "sections" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "EmailDraftVersion" ADD COLUMN "sections" TEXT NOT NULL DEFAULT '{}';
