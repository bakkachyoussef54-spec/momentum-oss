import { db } from "../db";
import type { BrandInput } from "../validation";
import { createBrand, addResearch } from "./brands";
import { createCampaign } from "./campaigns";
import { replaceContent } from "./emails";
import { logActivity } from "./settings";

/** Fictional demo brand. Clearly flagged `isDemo` so it can be removed in one click. */
export const DEMO_BRAND: BrandInput = {
  name: "Lunora Sleep (Demo)",
  website: "https://example.com/lunora",
  instagramUrl: "",
  toneOfVoice: "Calm, reassuring and quietly premium. Short sentences. No exclamation marks, no hype.",
  competitors: "Generic drugstore eye masks; silk masks from fashion brands",
  restrictions: 'Never say "cure" or "insomnia treatment". Avoid "game-changer". No medical claims.',
  researchNotes: "Fictional demo data for exploring the studio. Replace with a real client brief.",
  product: {
    name: "Lunora Contour Sleep Mask",
    category: "Sleep accessories",
    description: "A contoured sleep mask with molded eye cups that block light without pressing on the eyes. Adjustable strap, washable cover.",
    targetAudience: "Light-sensitive sleepers aged 25–45: shift workers, frequent travelers, and city dwellers with streetlight or early sunrise in the bedroom.",
    painPoints: "Waking up at sunrise or from streetlight\nFlat masks press on the eyes and feel uncomfortable\nMasks slip off during the night",
    desires: "Fall asleep faster in a dark room anywhere\nWake up without feeling groggy from early light\nA mask comfortable enough to forget it's there",
    features: "Molded 3D eye cups\nAdjustable, snag-free strap\nRemovable washable cover\nTravel pouch",
    benefits: "Blocks light without pressure on the eyes\nStays in place for side sleepers\nEasy to keep clean",
    usp: "Contoured cups create space for the eyes, so it blocks light without the pressure of a flat mask.",
    testimonials: "",
    objections: "Sleep masks feel hot or uncomfortable\nIt will slip off during the night\nIs it worth paying more than a drugstore mask?",
    pricing: "$34. Free returns within 30 days (fictional demo policy).",
    links: "https://example.com/lunora/contour-mask",
  },
};

export async function loadDemoData() {
  const existing = await db.brand.findFirst({ where: { isDemo: true } });
  if (existing) return existing;
  const brand = await createBrand(DEMO_BRAND, { isDemo: true });
  await addResearch({ brandId: brand.id, title: "Product spec sheet (demo)", url: "https://example.com/lunora/specs", kind: "document", category: "benefit", content: "Molded eye cups leave space for eyelashes and blinking. Strap adjusts from 50–64 cm.", status: "verified" });
  await addResearch({ brandId: brand.id, title: "Return policy (demo)", url: "https://example.com/lunora/returns", kind: "url", category: "pricing", content: "Free returns within 30 days of delivery.", status: "verified" });
  await addResearch({ brandId: brand.id, title: "Reddit thread themes (hypothesis)", url: "", kind: "note", category: "pain_point", content: "Side sleepers complain that masks shift when they turn over.", status: "hypothesis" });

  const campaign = await createCampaign(
    {
      brandId: brand.id,
      name: "Welcome Series — Darker Nights (Demo)",
      type: "welcome",
      audience: "New subscribers from the sleep-quiz pop-up who have not purchased",
      goal: "Convert new subscribers into first-time buyers of the Contour Sleep Mask",
      tone: "Calm & premium",
      emailCount: 3,
    },
    { isDemo: true },
  );
  const first = await db.campaignEmail.findFirst({ where: { campaignId: campaign.id, position: 1 } });
  if (first) {
    await replaceContent(
      first.id,
      {
        subjectLines: ["Darker mornings, starting tonight", "The mask that doesn't touch your eyes", "Why flat sleep masks feel wrong"],
        selectedSubject: 0,
        previewText: "A quick hello — and the small design change that makes light-blocking comfortable.",
        hook: "If the first light through your curtains wakes you before your alarm, you're not alone.",
        body: "Welcome to Lunora. We'll keep these emails short.\n\nMost people who join us have tried a sleep mask before. The usual complaint isn't the darkness — it's the pressure. Flat masks sit right on your eyelids, so you notice them all night.\n\nThe Contour Sleep Mask uses molded eye cups that leave space for your eyes. It blocks light without pressing on them, and the adjustable strap keeps it in place if you sleep on your side.\n\nOver the next few days, we'll answer the questions people usually ask before trying one.",
        cta: "See how the contour works",
        rationale: "AIDA: the hook names the reader's specific problem (early light), interest comes from reframing the real issue (pressure, not darkness), desire from the contoured-cup benefit, and a single low-commitment CTA.",
        researchRefs: ["Product spec sheet (demo)", "Profile: USP", "Profile: Pain points"],
      },
      { origin: "template", label: "Demo sample content (human-written example)" },
    );
  }
  await logActivity({ type: "demo.loaded", message: "Loaded demo data (Lunora Sleep)", brandId: brand.id });
  return brand;
}

export async function removeDemoData() {
  const { count } = await db.brand.deleteMany({ where: { isDemo: true } });
  await logActivity({ type: "demo.removed", message: `Removed demo data (${count} brand${count === 1 ? "" : "s"})` });
  return count;
}
