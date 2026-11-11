import type { BrandInput } from "../validation";

type FieldKey = Exclude<keyof BrandInput, "product"> | `product.${keyof BrandInput["product"]}`;

const HEADINGS: [RegExp, FieldKey][] = [
  [/^brand( name)?$/, "name"],
  [/^(brand )?website|^site$|^url$/, "website"],
  [/^instagram( url)?$/, "instagramUrl"],
  [/^product( name)?$/, "product.name"],
  [/^(product )?category$/, "product.category"],
  [/^(product )?description|^about( the product)?$/, "product.description"],
  [/^target audience|^audience|^ideal customer|^avatar$/, "product.targetAudience"],
  [/pain points?|^problems?$|^frustrations$/, "product.painPoints"],
  [/desires?|^goals$|^dreams$/, "product.desires"],
  [/features?$/, "product.features"],
  [/benefits?$/, "product.benefits"],
  [/^usp$|unique selling|^differentiator/, "product.usp"],
  [/(brand )?tone( of voice)?|^voice$/, "toneOfVoice"],
  [/^competitors?$/, "competitors"],
  [/testimonials?|reviews?$/, "product.testimonials"],
  [/objections?$/, "product.objections"],
  [/pricing|promotions?|offers?$|discounts?$/, "product.pricing"],
  [/restrictions?|compliance|do not say|don'?ts$/, "restrictions"],
  [/(research )?notes$/, "researchNotes"],
];

function matchHeading(raw: string): FieldKey | null {
  const h = raw.toLowerCase().replace(/[#*_:]/g, "").trim();
  if (!h || h.length > 40) return null;
  for (const [re, key] of HEADINGS) if (re.test(h)) return key;
  return null;
}

/**
 * Parse a pasted client brief that uses "Heading: value" lines or markdown headings into
 * brand fields. Unrecognized text is collected into research notes so nothing is lost.
 */
export function parseBriefText(text: string): { fields: Partial<Record<FieldKey, string>>; unmatched: string } {
  const fields: Partial<Record<FieldKey, string>> = {};
  const unmatched: string[] = [];
  let current: FieldKey | null = null;

  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^\s*#{1,6}\s*(.+?)\s*$/);
    const inline = line.match(/^\s*\**([A-Za-z' /&()-]{2,40}?)\**\s*:\s*(.*)$/);
    if (heading && matchHeading(heading[1])) {
      current = matchHeading(heading[1]);
      continue;
    }
    if (inline && matchHeading(inline[1])) {
      current = matchHeading(inline[1]);
      const value = inline[2].trim();
      if (value && current) fields[current] = fields[current] ? `${fields[current]}\n${value}` : value;
      continue;
    }
    if (current) {
      if (line.trim()) fields[current] = fields[current] ? `${fields[current]}\n${line.trim()}` : line.trim();
    } else if (line.trim()) {
      unmatched.push(line.trim());
    }
  }
  return { fields, unmatched: unmatched.join("\n") };
}
