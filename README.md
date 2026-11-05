# Re:Gap

**A visual, evidence-first workspace for research discovery.**

Re:Gap helps researchers organize literature, inspect limitations, explore candidate research gaps, and translate research questions into concrete experiment plans. Its interactive perspective graph displays links between papers and gap candidates.

> **Prototype scope:** The bundled papers and gap candidates are fictional examples, not authentic citations or validated discoveries. The frontend runs locally in the browser; it has no external literature database, AI novelty analysis, authentication, or shared persistence yet.

## What works

- **Overview:** A responsive workspace with a draggable, zoomable **3D-projected knowledge graph**. Clicking a paper or gap node opens its evidence context in the source inspector.
- **Paper library:** Search and sort, add custom papers (title, authors, year, venue, notes, optional DOI/source URL), inspect papers, open manually supplied source links, and delete manually added records.
- **Gap explorer:** Create your own candidate research questions, link them to papers, inspect evidence, shortlist ideas, delete your own candidates, and create experiments from them. Custom gaps are saved locally. The graph prioritizes papers linked to the visible gaps.
- **Experiment planning:** Save hypotheses, baselines, and success metrics; track status as planned, in progress, or completed; delete plans.
- **Usability:** Dark/light theme, responsive navigation, keyboard search (**⌘/Ctrl + K** or **/**), draggable graph with keyboard rotation (arrow keys while a graph control is focused), reduced-motion support, and validated JSON export/import of locally stored user data.

All interactive state is stored in browser `localStorage` (per browser/device). It is **not synchronized** across teammates or sessions on different devices. Exported JSON can be re-imported using **Import backup**. Import validates the version and linked records, then asks for confirmation before replacing local workspace content. It includes custom papers, custom candidate gaps, shortlists, and experiment plans.

The constellation intentionally displays up to **five gaps and eight papers** at once. It prioritizes papers connected to those visible gaps; the full data remains accessible in the library and gap explorer.

### Run locally

Requires **Node.js 24+** and **pnpm 11.25.0**.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter web dev
```

Visit **http://localhost:3000**.

### Check before merging

```bash
pnpm exec biome ci .
pnpm check-types
pnpm exec turbo run build --filter=web
```

Pull requests to `main` run these checks in GitHub Actions. The branch also runs Chromium-based desktop/mobile smoke checks of core user journeys.

Run the data regression tests directly with:

```bash
pnpm test:unit
```

## Repository structure

```text
apps/web/
  app/
    layout.tsx              Fonts, metadata, and styles
    page.tsx                App entry point
    workspace.css           Research workspace design system
    globals.css             Tailwind and base tokens
  components/
    immersive-workspace.tsx Main flows, navigation, inspector, forms
    add-gap-dialog.tsx      Evidence-linked custom gap creation
    research-graph.tsx      Interactive perspective graph
    research-workspace.tsx  Original prototype, kept for reference
  lib/
    demo-data.ts            Fictional research examples
    research-data.ts        Runtime validation and source links
    research-data.test.mjs  Data/backup integrity regression tests
  hooks/
    use-persistent-state.ts Browser state persistence and validation
    use-modal-focus.ts      Dialog keyboard focus management
scripts/
  smoke-ui.mjs              Chromium end-to-end smoke tests
docs/
  FRONTEND_QA.md            Manual acceptance checklist
packages/                   Shared UI and monorepo configuration
.github/workflows/
  ci.yml                    Typecheck, unit tests, build, Biome
  browser-smoke.yml         Desktop/mobile browser smoke checks
```

## Solo development and safe deployments

Re:Gap is currently maintained by one developer with AI assistance. Changes should use a feature branch and a pull request, even when there is no separate human reviewer. Keep `main` stable.

1. Implement changes on `feat/*`, not directly on `main`.
2. Run the unit tests, strict TypeScript checks, production build, and Biome lint/format checks.
3. Open or update a pull request targeting `main`, and wait for **Re:Gap CI** and **Re:Gap Browser Smoke** to pass on the **latest commit**.
4. Check the **latest** Vercel preview deployment. Do not infer the current state from red historical runs on old commits.
5. Merge the tested pull request. GitHub Actions checks both workflows again on `main`; verify that Vercel marks the new production deployment Ready and that the public domain serves the updated site.
6. When production fails, use that deployment's own build logs, commit SHA, root-directory configuration, and environment settings to identify the cause before making another change.

For a manual release check, see [the acceptance checklist](docs/FRONTEND_QA.md). GitHub CI and Vercel preview success reduce deployment risk; they do not prove zero remaining bugs.

## Next milestones

1. Replace fictional fixtures with a typed backend/API and real, verified citations.
2. Introduce user accounts, database persistence, and shared team workspaces.
3. Add paper provenance (DOI, URL, quote spans, retrieval timestamps), citation parsing, and evidence links.
4. Build novelty-check workflows that actively search for contradicting related work, with confidence justified by sources.
5. Create unit, integration, accessibility, and end-to-end coverage before a production launch.

**Research safeguard:** An inferred research gap is a *hypothesis* until verified through a literature review. Re:Gap must not label generated claims as proven novelty.
