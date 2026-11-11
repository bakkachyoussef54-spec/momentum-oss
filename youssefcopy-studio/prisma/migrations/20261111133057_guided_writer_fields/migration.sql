-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CampaignEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "objective" TEXT NOT NULL DEFAULT '',
    "framework" TEXT NOT NULL DEFAULT '',
    "segment" TEXT NOT NULL DEFAULT '',
    "subjectLines" TEXT NOT NULL DEFAULT '[]',
    "selectedSubject" INTEGER NOT NULL DEFAULT 0,
    "previewText" TEXT NOT NULL DEFAULT '',
    "hook" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "cta" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "researchRefs" TEXT NOT NULL DEFAULT '[]',
    "sections" TEXT NOT NULL DEFAULT '{}',
    "contentOrigin" TEXT NOT NULL DEFAULT 'empty',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignEmail_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CampaignEmail" ("approvedVersionId", "body", "campaignId", "contentOrigin", "createdAt", "cta", "framework", "hook", "id", "objective", "position", "previewText", "rationale", "researchRefs", "role", "segment", "selectedSubject", "status", "subjectLines", "updatedAt") SELECT "approvedVersionId", "body", "campaignId", "contentOrigin", "createdAt", "cta", "framework", "hook", "id", "objective", "position", "previewText", "rationale", "researchRefs", "role", "segment", "selectedSubject", "status", "subjectLines", "updatedAt" FROM "CampaignEmail";
DROP TABLE "CampaignEmail";
ALTER TABLE "new_CampaignEmail" RENAME TO "CampaignEmail";
CREATE UNIQUE INDEX "CampaignEmail_campaignId_position_key" ON "CampaignEmail"("campaignId", "position");
CREATE TABLE "new_EmailDraftVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "subjectLines" TEXT NOT NULL DEFAULT '[]',
    "selectedSubject" INTEGER NOT NULL DEFAULT 0,
    "previewText" TEXT NOT NULL DEFAULT '',
    "hook" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "cta" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "researchRefs" TEXT NOT NULL DEFAULT '[]',
    "sections" TEXT NOT NULL DEFAULT '{}',
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "label" TEXT NOT NULL DEFAULT '',
    "aiModel" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDraftVersion_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "CampaignEmail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmailDraftVersion" ("aiModel", "body", "createdAt", "cta", "emailId", "hook", "id", "label", "origin", "previewText", "rationale", "researchRefs", "selectedSubject", "subjectLines", "versionNumber") SELECT "aiModel", "body", "createdAt", "cta", "emailId", "hook", "id", "label", "origin", "previewText", "rationale", "researchRefs", "selectedSubject", "subjectLines", "versionNumber" FROM "EmailDraftVersion";
DROP TABLE "EmailDraftVersion";
ALTER TABLE "new_EmailDraftVersion" RENAME TO "EmailDraftVersion";
CREATE UNIQUE INDEX "EmailDraftVersion_emailId_versionNumber_key" ON "EmailDraftVersion"("emailId", "versionNumber");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "painPoints" TEXT NOT NULL DEFAULT '',
    "desires" TEXT NOT NULL DEFAULT '',
    "features" TEXT NOT NULL DEFAULT '',
    "benefits" TEXT NOT NULL DEFAULT '',
    "usp" TEXT NOT NULL DEFAULT '',
    "testimonials" TEXT NOT NULL DEFAULT '',
    "objections" TEXT NOT NULL DEFAULT '',
    "pricing" TEXT NOT NULL DEFAULT '',
    "links" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("benefits", "brandId", "category", "createdAt", "description", "desires", "features", "id", "name", "objections", "painPoints", "pricing", "targetAudience", "testimonials", "updatedAt", "usp") SELECT "benefits", "brandId", "category", "createdAt", "description", "desires", "features", "id", "name", "objections", "painPoints", "pricing", "targetAudience", "testimonials", "updatedAt", "usp" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
