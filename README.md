# Re:Gap

**A visual, evidence-first workspace for research discovery.**

Re:Gap helps researchers organize literature, inspect limitations, explore candidate research gaps, and translate research questions into concrete experiment plans. Its interactive perspective graph displays links between papers and gap candidates.

> **Prototype scope:** The bundled papers and gap candidates are fictional examples, not authentic citations or validated discoveries. The frontend runs locally in the browser; it has no external literature database, AI novelty analysis, authentication, or shared persistence yet.

## What works

- **Overview:** A responsive workspace with a draggable, zoomable **3D-projected knowledge graph**. Clicking a paper or gap node opens its evidence context in the source inspector.
- **Paper library:** Search and sort, add custom papers (title, authors, year, venue, notes, optional DOI/source URL), inspect papers, open manually supplied source links, and delete manually added records.
- **Gap explorer:** Create your own candidate research questions, link them to papers, inspect evidence, shortlist ideas, delete your own candidates, and create experiments from them. Custom gaps are saved locally. The graph prioritizes papers linked to the visible gaps.
- **Experiment planning:** Save hypotheses, baselines, and success metrics; track status as planned, in progress, or completed; delete plans.
- **Usability:** Dark/light theme, responsive navigation, keyboard search (**⌘/Ctrl + K** or **/**), draggable graph with keyboard rotation (arrow keys while a graph control is focused), reduced-motion support, and JSON export of locally stored user data.

All interactive state is stored in browser `localStorage` (per browser/device). It is **not synchronized** across teammates or sessions on different devices. Exported JSON is a backup snapshot, not an import feature. It includes custom papers, custom candidate gaps, shortlists, and experiment plans.

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

Pull requests to `main` run these checks in GitHub Actions.

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
    research-graph.tsx      Interactive 3D perspective graph
    research-workspace.tsx  Original prototype (kept for reference)
  hooks/
    use-persistent-state.ts Browser state persistence
  lib/
    demo-data.ts            Clearly fictional paper and gap fixtures
packages/                   Shared UI and monorepo configuration
.github/workflows/ci.yml    PR quality gate
```

## How to work as a team

Keep `main` green. Each teammate works on a separate `feat/*` branch, opens a pull request, waits for CI, and requests review before merging. Do not change another person's active branch or commit credentials/secrets. Recommended divisions:

1. **Frontend & accessibility:** UI, graphs, keyboard interactions, responsive layouts, integration tests.
2. **Literature & evidence model:** real paper metadata sources, provenance, source links, limitation extraction, evidence traceability.
3. **Experiment & gap reasoning:** validation methods, experiment schemas, backend workflows, evaluation.

## Next milestones

1. Replace fictional fixtures with a typed backend/API and real, verified citations.
2. Introduce user accounts, database persistence, and shared team workspaces.
3. Add paper provenance (DOI, URL, quote spans, retrieval timestamps), citation parsing, and evidence links.
4. Build novelty-check workflows that actively search for contradicting related work, with confidence justified by sources.
5. Create unit, integration, accessibility, and end-to-end coverage before a production launch.

**Research safeguard:** An inferred research gap is a *hypothesis* until verified through a literature review. Re:Gap must not label generated claims as proven novelty.
