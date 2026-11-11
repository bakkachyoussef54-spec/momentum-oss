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
| **Copywriting Analyzer** | Transparent heuristic scoring out of 100 across 8 categories, including Factual accuracy (see below). It flags risky copy and lists the 3 highest-priority weaknesses with fixes. A paste mode runs entirely in the browser. |
| **Templates** | 8 original built-in templates covering 7 categories, each with goal, framework, outline, placeholder example and personalization guidance. You can also create custom templates. |
| **Client Delivery** | Exports Markdown, DOCX and plain text, plus a print view for *Save as PDF*. Uses each email's **approved snapshot**. Unapproved emails, or emails edited after approval, are clearly marked. |
| **Settings** | AI status and on/off toggle, JSON backup export/import (merge, never deletes), demo data load/remove, and restore for archived records. |

### Writing safeguards

- Drafts may only use facts from the brand profile and *verified* research. Hypotheses are labelled as such in prompts.
- Imported research is treated as untrusted. Lines that look like instructions to an AI are flagged and withheld from prompts.
- The analyzer flags unsubstantiated health claims, numbers not found in the evidence, fake urgency, misleading subject lines and weak CTAs.
- Nothing overwrites a draft without a version snapshot. Deleting a brand or campaign requires typing its name; archiving is reversible.

## Hybrid Edition: Human Mode | AI Mode

Every email editor has a **Human Mode | AI Mode** switch. Both modes edit the same draft, so switching never loses work. Freeform editing, previews, version history, the quality panel and approval are shared.

**Human Mode** works completely offline. It walks you through 12 steps:

1. Objective
2. Target audience
3. One pain point (chosen from your research)
4. One verified benefit (only benefits from the brief or verified research can be chosen)
5. Framework: AIDA, PAS, BAB, 4Ps, Benefit-Led or Story-Based, each with an editable outline
6. Three subject lines
7. Preview text
8. Opening hook
9. Body copy, written in three framework-specific parts (e.g. PAS: Problem → Solution → Remove the last doubt)
10. One CTA
11. Strategic rationale
12. Review & approve

Each step has a **writing coach** (why the component matters, do/avoid tips, a short exercise), original example structures, and **rule-based suggestions** assembled from your verified inputs. Suggestions are never presented as AI, and missing details appear as `[placeholders]`.

**AI Mode** uses the provider you choose: OpenAI, Anthropic, any OpenAI-compatible server, or **Ollama running locally**. You can:

- generate a full draft from the brand research;
- generate individual parts: three subject lines, preview text, hooks, body, CTAs or rationale;
- rewrite, improve, shorten or apply targeted fixes.

Each request can set tone, length, framework and creativity. Every result is shown **before/after** (with options to pick from), and you **accept or reject** it. The AI must use only the brief and verified research; if facts are missing it lists them instead of inventing them. If research is insufficient, generation is refused with the list of missing items.

**Approved emails are protected.** AI drafts, templates and restores ask for explicit confirmation on an approved email, and the server enforces this. The approved version stays in client exports until you approve again.

The Analyzer keeps the deterministic score and adds an optional **AI-assisted editorial review** (8 categories, 3 prioritized improvements, factual-grounding concerns). It is clearly labelled as advisory.

## The guided three-email workflow (V2)

The dashboard tracks every campaign through **Brand Profile → Research → Campaign → Email 1 → Email 2 → Email 3 → Review → Export**. Each step shows whether it is complete, in progress or not started. Every step stays clickable, and edits autosave, so you can go back without losing work. A compact version of the bar appears on the brand, research, campaign, editor and delivery pages.

1. **Guided brand intake.** A live checklist covers identity, product, audience, pain points, desires, verified benefits, objections, voice and product links. *Structured brief* (`/brands/<id>/brief`) organizes the profile and research using fixed rules:
   - Verified facts, hypotheses and unreviewed notes are kept separate.
   - Lines from general or unreviewed documents are auto-sorted into pain points, desires, benefits, objections and reviews, and labelled *not verified*.
   - Nothing is invented.
2. **One-click planning.** *Plan 3-email campaign* creates a Welcome Series by default (other types are optional):
   - Email 1 introduces the product and its primary benefit.
   - Email 2 addresses the most important (first-listed) objection.
   - Email 3 reinforces the value and guides the purchase decision.
   - Each email gets an objective, framework, audience segment, main message, CTA strategy, supporting research and timing.
   - No API key is needed.
3. **Write each email in Human Mode or AI Mode** (see the Hybrid section below).
   - Content written with rule-based help is labelled **Guided · rule-based assist**. AI output is labelled **AI-assisted**, or **AI-assisted · human-edited** once you change it.
4. **Quality review.** The analyzer scores Audience 15 · Clarity 15 · Benefits 15 · Persuasiveness 15 · **Factual accuracy 15** · CTA 10 · Specificity 10 · Voice 5. Factual accuracy flags health claims, figures not found in the evidence, and quotes that aren't verified. The analyzer lists the **three highest-priority weaknesses**, each with a practical fix. Scores are heuristic and cannot predict sales.
5. **Review & export.** *Client Delivery* has a per-email checklist: three subject lines, preview text, hook and body, CTA, rationale, research references, and approval. It then exports DOCX, Markdown or plain text.

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

### Updating an existing install on Windows (keeps your data)

Your work lives in `youssefcopy-studio\dev.db`. Git never tracks or overwrites it. Database updates only **add** columns, and `npm run db:migrate` takes a backup first.

```powershell
cd <repo>\youssefcopy-studio
# 1. Stop the running app (Ctrl+C in its window).
# 2. Make a safety copy of your data:
npm run db:backup           # writes backups\dev-YYYYMMDD-HHMMSS.db
# 3. Get the new version:
git fetch origin
git checkout main           # or the branch you were given
git pull
# 4. Install and apply the database update (backs up again, then migrates):
npm install
npm run db:migrate
# 5. Start again:
npm run dev
```

- **Extra safety:** *Settings → Export JSON backup* downloads everything as JSON.
- **To roll back:** stop the app, copy the file from `backups\` over `dev.db`, then check out the previous version.
- **Do not run `prisma migrate reset` or `prisma migrate dev`.** They are development commands that can delete data. `db:migrate` runs `prisma migrate deploy`, which only applies pending migrations.

### Enabling AI Mode (optional)

AI Mode is optional; Human Mode never needs it. Choose a provider in **Settings → AI Mode provider**, then click **Save & test connection**. The test only lists models, so it costs nothing.

**Free and local: Ollama on Windows (no key, no subscription)**

1. Install Ollama from https://ollama.com/download (Windows installer). It runs in the background at `http://127.0.0.1:11434`.
2. In PowerShell, download a small model: `ollama pull qwen3:1.7b` (about 1.4 GB; works on modest PCs).
3. In the app, open Settings and choose **Ollama (local)**. Model `qwen3:1.7b` and the default URL are pre-filled. Click **Save & test connection**.

If Ollama is not installed or not running, the app tells you exactly that and Human Mode keeps working. Small local models can take a minute per email on a laptop CPU. For better copy, use a larger model if your PC allows it (e.g. `qwen3:8b`).

**Paid APIs (OpenAI / Anthropic / OpenAI-compatible)**

Put the key in `.env` and restart `npm run dev`, then choose the provider in Settings:

```env
OPENAI_API_KEY=sk-...        # OpenAI
ANTHROPIC_API_KEY=...        # Anthropic
```

- **Keys are only read on the server.** The Settings page shows whether a key is set, never its value.
- **No fallback.** The app calls exactly the provider you choose and never switches to another one.
- **Research only leaves your machine on request.** It is sent only when you click a generate or AI action (and with Ollama it never leaves your machine).
- **Generation preferences.** Tone, length, framework and creativity can be set in Settings and adjusted per request in AI Mode.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm test` | Vitest unit + integration tests (uses a throwaway `test.db`) |
| `npm run test:e2e` | Playwright (run `npm run build` first; uses `e2e.db` on port 3100). Run `npx playwright install chromium` once beforehand. |
| `npm run db:backup` | Safe copy of the SQLite database to `backups/` (works while the app runs) |
| `npm run db:migrate` | Back up, then apply pending migrations (`prisma migrate deploy`, non-destructive) |
| `npm run db:migrate:dev` | Create a new migration after editing `prisma/schema.prisma` |

## Architecture

```
prisma/                 schema.prisma + migrations (Brand, Product, ResearchSource, Campaign,
                        CampaignEmail, EmailDraftVersion, CopywritingAnalysis, Template,
                        ActivityLog, AppSetting)
src/lib/                framework-free domain logic (unit-tested)
  research/             Stage A validation, Stage B psychology, paste parser, structured brief
  writing/              guided-writer steps, example structures, rule-based suggestions
  workflow/             workflow step status and package review checks
  strategy/             Stages C–D playbooks, framework selection, campaign brief
  analyzer/             Stage F heuristic scoring and flags
  ai/                   provider-agnostic adapter (OpenAI, Anthropic, OpenAI-compatible, Ollama), prompts, JSON schemas, connection test
  export/               Markdown, plain-text and DOCX builders
  services/             Prisma-backed data access used by pages, actions and routes
src/app/                pages (server components), actions.ts (server actions), api/ (AI, export, backup)
src/components/         UI; components/ui holds shadcn primitives
tests/                  unit, integration (real SQLite + migrations) and e2e (Playwright)
```

- **AI flow.** The browser calls `POST /api/ai/generate`, `/api/ai/revise` or `/api/ai/review`. Settings (provider, model, local URL, preferences) are stored in `AppSetting` — never keys. The route passes `request.signal` to the provider call, combined with a timeout. The response is validated with Zod, and the previous draft is snapshotted before the new content is saved. Invalid AI output is rejected and nothing is saved.
- **JSON-shaped columns** are stored as TEXT and validated with Zod on read.

## Test results (at time of writing)

- `npm run typecheck`: pass
- `npm run lint`: pass (0 problems)
- `npm test`: 82 tests across 8 files, all passing.
  - **Real database, mocked AI:** these run against a real migrated SQLite database, but every AI provider call is **mocked** (stubbed HTTP). No real model is called.
  - **Coverage:** analyzer, planning, structured brief, the 12-step Human Mode, provider settings resolution, the Ollama/OpenAI/Anthropic adapters, connection tests, AI generation and revision via the services, the approved-draft lock, insufficient-research refusal, cancellation, exports, and backups.
- `npm run build`: pass
- `npm run test:e2e`: 6 tests, all passing. In AI Mode the app talks to `tests/e2e/mock-ollama.mjs`, a **mock** of the Ollama API with canned answers. The tests cover:
  - every navigation page;
  - the V1 sleep-mask workflow;
  - the V2 guided three-email flow without an API key;
  - the Hybrid flow: configure Ollama, unreachable-server error, Human Mode → AI Mode switch, generate, compare/accept/reject, approval lock, version restore, and AI review;
  - missing inputs and the mobile layout.
- **Real local AI (not mocked):** `OLLAMA_LIVE=1 npm test -- tests/live` runs against a running Ollama server. It passed in the development sandbox with Ollama 0.40.16 and `qwen3:1.7b` on a 2-vCPU Linux machine: a schema-valid draft in ~23 s, no health claims flagged, and 3 CTA options. **It has not been run on your Windows PC.** Run it there after installing Ollama to confirm.

## Limitations & deployment requirements

- **Single-user and unauthenticated.** It is designed to run on your own machine. **Do not deploy it publicly** without adding authentication and authorization (for example Auth.js) and HTTPS.
- **SQLite on local disk.** Serverless hosts with ephemeral filesystems will lose data. Deploying would need a persistent volume, or a move to Postgres (a new Prisma datasource and migrations).
- **Paid providers (OpenAI, Anthropic) were not called for real.** No keys were available, so those adapters are only tested with mocked HTTP. Ollama was tested for real in the sandbox (see above). Small local models write simpler copy than large hosted models, so always edit AI-assisted drafts.
- **Quality scores are heuristic** editorial guidance. They cannot predict opens, clicks, sales or revenue.
- **Rule-based suggestions** in the guided writer are assembled from your inputs by fixed templates. They are a starting point to edit, not finished copy, and they are never presented as AI output.
- **Document import** accepts plain text only (`.txt/.md/.csv`). For DOCX/PDF briefs, paste the text instead.
- **PDF export** uses the browser's print dialog ("Save as PDF").
- **No email sending, ESP integration or web scraping, by design.**

This is not production-ready for multi-user or hosted use until authentication, a persistent database and deployment behavior have been added and verified.
