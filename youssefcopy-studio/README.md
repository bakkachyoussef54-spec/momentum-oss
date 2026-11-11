# YoussefCopy AI Email Studio

A local, single-user workspace for a freelance email copywriter. It turns verified client research into strategically planned email campaigns, with the human editor in control the whole way. It is a writing assistant, not an email sender.

Built with Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, shadcn/ui (Base UI), Lucide, Motion, Prisma 7 + SQLite, Zod, Vitest and Playwright.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Shows real counts from your saved records (brands, active campaigns, drafts, completed emails, emails awaiting review), plus recent activity and recent campaigns. It never shows fabricated analytics. |
| **Brands** | Holds the full client profile: brand, product, audience, pain points, desires, features, benefits, USP, voice, competitors, testimonials, objections, pricing, restrictions and notes. *Paste from document* fills the fields from a pasted brief. |
| **Brand Research** | Stores research items with source URLs, each marked **verified / hypothesis / unreviewed**. You can import `.txt/.md/.csv` files up to 1 MB. Also shows a readiness report (Stage A) and a customer-psychology summary (Stage B). |
| **Campaign Builder** | A 7-step wizard: brand → type (8 types) → audience → goal → tone → number of emails (default 3) → brief. A rule-based strategist gives each email a distinct role and picks its framework from the email's intent and the available evidence. |
| **AI Email Generator** | Runs the pipeline A→H. With AI configured, it generates drafts one email at a time, with cancellation and token/cost display. Without AI, it offers recommended template scaffolds instead. These are clearly labelled and never passed off as AI output. |
| **Email Editor** | Three-panel layout with autosave (visible status), Ctrl/⌘+S, version history and restore, undo/redo, word/character counts, inbox/mobile/plain-text previews, copy to clipboard, and AI-vs-human origin labels. Optional AI actions return a proposal you must approve before anything changes. |
| **Copywriting Analyzer** | Transparent heuristic scoring out of 100 (Audience 20 · Clarity 20 · Benefits 20 · Persuasiveness 15 · CTA 10 · Specificity 10 · Voice 5). It flags risky copy and gives 3 prioritized improvements. A paste mode runs entirely in the browser. |
| **Templates** | 8 original built-in templates covering 7 categories, each with goal, framework, outline, placeholder example and personalization guidance. You can also create custom templates. |
| **Client Delivery** | Exports Markdown, DOCX and plain text, plus a print view for *Save as PDF*. Uses each email's **approved snapshot**. Unapproved emails, or emails edited after approval, are clearly marked. |
| **Settings** | AI status and on/off toggle, JSON backup export/import (merge, never deletes), demo data load/remove, and restore for archived records. |

### Writing safeguards

- Drafts may only use facts from the brand profile and *verified* research. Hypotheses are labelled as such in prompts.
- Imported research is treated as untrusted. Lines that look like instructions to an AI are flagged and withheld from prompts.
- The analyzer flags unsubstantiated health claims, numbers not found in the evidence, fake urgency, misleading subject lines and weak CTAs.
- Nothing overwrites a draft without a version snapshot. Deleting a brand or campaign requires typing its name; archiving is reversible.

## Local setup (Windows)

Requirements: **Node.js 20.19+ (22 or 24 LTS recommended)** and Git. Use PowerShell:

```powershell
git clone <your-repo-url>
cd <repo>\youssefcopy-studio
npm install                 # also runs `prisma generate`
Copy-Item .env.example .env
npm run db:migrate          # creates dev.db from prisma/migrations
npm run dev                 # http://localhost:3000
```

Notes:
- `better-sqlite3` ships prebuilt Windows binaries. If `npm install` tries to compile it, install the "Desktop development with C++" workload from Visual Studio Build Tools, or switch to an LTS Node version.
- npm 11 may ask you to approve install scripts. The approved list (`allowScripts`) is in `package.json`.
- To explore first, open **Settings → Load demo data**. This adds a fictional sleep-mask brand, which you can remove with one click.

macOS/Linux: the same commands, with `cp .env.example .env`.

### Enabling AI (optional)

Edit `.env`, then restart `npm run dev`:

```env
AI_PROVIDER=openai          # or anthropic, openai-compatible
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=sk-...
```

- Keys are read on the server only.
- The app calls exactly the provider you configure and never falls back to another one.
- Research is sent only when you click a generate or AI action.
- Set `AI_INPUT_COST_PER_MTOK` / `AI_OUTPUT_COST_PER_MTOK` to see cost estimates.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm test` | Vitest unit + integration tests (uses a throwaway `test.db`) |
| `npm run test:e2e` | Playwright (run `npm run build` first; uses `e2e.db` on port 3100). Run `npx playwright install chromium` once beforehand. |
| `npm run db:migrate` | Apply migrations (non-destructive) |
| `npm run db:migrate:dev` | Create a new migration after editing `prisma/schema.prisma` |

## Architecture

```
prisma/                 schema.prisma + migrations (Brand, Product, ResearchSource, Campaign,
                        CampaignEmail, EmailDraftVersion, CopywritingAnalysis, Template,
                        ActivityLog, AppSetting)
src/lib/                framework-free domain logic (unit-tested)
  research/             Stage A validation, Stage B psychology, paste parser
  strategy/             Stages C–D playbooks, framework selection, campaign brief
  analyzer/             Stage F heuristic scoring and flags
  ai/                   provider-agnostic adapter (OpenAI, Anthropic, OpenAI-compatible), prompts, schemas
  export/               Markdown, plain-text and DOCX builders
  services/             Prisma-backed data access used by pages, actions and routes
src/app/                pages (server components), actions.ts (server actions), api/ (AI, export, backup)
src/components/         UI; components/ui holds shadcn primitives
tests/                  unit, integration (real SQLite + migrations) and e2e (Playwright)
```

- **AI flow.** The browser calls `POST /api/ai/generate` or `/api/ai/revise`. The route passes `request.signal` to the provider call, combined with a timeout. The response is validated with Zod, and the previous draft is snapshotted before the new content is saved. Invalid AI output is rejected and nothing is saved.
- **JSON-shaped columns** are stored as TEXT and validated with Zod on read.

## Test results (at time of writing)

- `npm run typecheck`: pass
- `npm run lint`: pass (0 problems)
- `npm test`: 41 tests across 4 files, all passing. Covers the analyzer, planning, compliance, templates, AI adapter (mocked fetch), exports, and a full service workflow on a real migrated SQLite DB.
- `npm run build`: pass
- `npm run test:e2e`: 4 tests, all passing. Covers every nav page, the full sleep-mask welcome-series workflow (create, edit, persist, research, campaign, template, autosave, version, reload, approve, analyze, export), missing inputs, and the mobile layout.

## Limitations & deployment requirements

- **Single-user and unauthenticated.** It is designed to run on your own machine. **Do not deploy it publicly** without adding authentication and authorization (for example Auth.js) and HTTPS.
- **SQLite on local disk.** Serverless hosts with ephemeral filesystems will lose data. Deploying would need a persistent volume, or a move to Postgres (a new Prisma datasource and migrations).
- **Live AI generation was not exercised against a real provider in this build** (no credentials were available). The adapter is unit-tested with mocked HTTP responses. Verify with your own key before relying on it.
- **Quality scores are heuristic** editorial guidance, not predictions of opens, clicks or revenue.
- **Document import** accepts plain text only (`.txt/.md/.csv`). For DOCX/PDF briefs, paste the text instead.
- **PDF export** uses the browser's print dialog ("Save as PDF").
- **No email sending, ESP integration or web scraping, by design.**

This is not production-ready for multi-user or hosted use until authentication, a persistent database and deployment behavior have been added and verified.
