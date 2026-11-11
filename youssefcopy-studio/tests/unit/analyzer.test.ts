import { describe, expect, it } from "vitest";
import { analyzeEmail, SCORE_DISCLAIMER } from "@/lib/analyzer";
import { sleepMaskBrand, verifiedResearch } from "../fixtures";

const goodEmail = {
  subjectLines: ["Darker mornings, starting tonight", "", ""],
  selectedSubject: 0,
  previewText: "The small design change that makes light-blocking comfortable.",
  hook: "Does the first light through your curtains wake you before your alarm?",
  body:
    "Most light-sensitive sleepers have tried a sleep mask. The complaint usually isn't darkness — it's pressure on the eyes.\n\nThe Nocturne Contour Mask uses molded eye cups that leave space for your eyes. It blocks light without pressure, so you can fall asleep faster in a dark room.\n\nThe adjustable strap stays in place for side sleepers, which means you wake up with it still on.",
  cta: "See how the contour works",
  segment: "New subscribers who haven't purchased",
};

describe("analyzeEmail", () => {
  it("scores out of 100 with the specified category weights", () => {
    const r = analyzeEmail(goodEmail, sleepMaskBrand(), verifiedResearch);
    expect(r.breakdown.map((b) => [b.key, b.max])).toEqual([
      ["audience", 20],
      ["clarity", 20],
      ["benefits", 20],
      ["persuasiveness", 15],
      ["cta", 10],
      ["specificity", 10],
      ["voice", 5],
    ]);
    expect(r.totalScore).toBe(r.breakdown.reduce((s, b) => s + b.score, 0));
    expect(r.totalScore).toBeGreaterThan(55);
    expect(r.improvements).toHaveLength(3);
    expect(r.disclaimer).toBe(SCORE_DISCLAIMER);
    expect(r.disclaimer).toMatch(/not a scientifically validated predictor/);
  });

  it("flags unsubstantiated health claims, unsupported numbers, urgency and weak openings", () => {
    const r = analyzeEmail(
      {
        ...goodEmail,
        subjectLines: ["RE: LAST CHANCE!!"],
        hook: "I hope this email finds you well.",
        body: "Our mask is clinically proven and cures insomnia. 93% of users sleep 2 hours longer. Hurry, last chance, act now!",
        cta: "Click here",
      },
      sleepMaskBrand({ pricing: "" }),
      [],
    );
    const kinds = r.flags.map((f) => f.kind);
    expect(kinds).toContain("health_claim");
    expect(kinds).toContain("unsupported_claim");
    expect(kinds).toContain("excessive_urgency");
    expect(kinds).toContain("weak_opening");
    expect(kinds).toContain("unclear_cta");
    expect(kinds).toContain("misleading_subject");
    expect(r.improvements[0]).toMatch(/medical|claim/i);
  });

  it("does not flag numbers that appear in verified evidence", () => {
    const r = analyzeEmail({ ...goodEmail, body: `${goodEmail.body}\n\nAnd returns are free within 30 days.` }, sleepMaskBrand(), verifiedResearch);
    expect(r.flags.find((f) => f.kind === "unsupported_claim")).toBeUndefined();
  });

  it("handles an empty email gracefully", () => {
    const r = analyzeEmail({ subjectLines: [], selectedSubject: 0, previewText: "", hook: "", body: "", cta: "" }, sleepMaskBrand());
    expect(r.totalScore).toBeLessThan(15);
    expect(r.flags.map((f) => f.kind)).toContain("unclear_cta");
  });

  it("detects repetitive language", () => {
    const body = "You will love the mask. You will love the strap. You will love the cups. You will love the fit.";
    const r = analyzeEmail({ ...goodEmail, body }, sleepMaskBrand());
    expect(r.flags.map((f) => f.kind)).toContain("repetitive_language");
  });
});
