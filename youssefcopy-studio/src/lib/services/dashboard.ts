import { db } from "../db";

/** Every number here is a count of stored records — nothing is estimated or simulated. */
export async function getDashboardData() {
  const liveCampaign = { archivedAt: null, brand: { archivedAt: null } };
  const [totalBrands, activeCampaigns, emailDrafts, completedEmails, awaitingReview, recentActivity, recentCampaigns, demoBrands] = await Promise.all([
    db.brand.count({ where: { archivedAt: null } }),
    db.campaign.count({ where: { ...liveCampaign, status: { not: "completed" } } }),
    db.campaignEmail.count({ where: { campaign: liveCampaign, status: { not: "approved" }, contentOrigin: { not: "empty" } } }),
    db.campaignEmail.count({ where: { campaign: liveCampaign, status: "approved" } }),
    db.campaignEmail.count({ where: { campaign: liveCampaign, status: "in_review" } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.campaign.findMany({
      where: liveCampaign,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { brand: { select: { name: true } }, emails: { select: { status: true, contentOrigin: true } } },
    }),
    db.brand.count({ where: { isDemo: true } }),
  ]);
  return { totalBrands, activeCampaigns, emailDrafts, completedEmails, awaitingReview, recentActivity, recentCampaigns, demoBrands };
}
