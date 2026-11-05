# Re:Gap — Observatory redesign

This is a staged redesign of the real application, not an unrelated visual mock-up. Preserve researcher data, accessibility, and functional flows while upgrading the experience in small testable releases.

## Design thesis

**The Observatory:** a scientific instrument for navigating research. The UI should feel precise, calm, and unusually capable—not like a generic analytics dashboard or a purely decorative sci-fi interface.

- **Dark / Night Lab:** graphite and deep pine surfaces, high-contrast text, chartreuse evidence signals, and cool-cyan candidate relationships.
- **Light / Daylight Lab:** warm laboratory paper and forest-ink surfaces, with the same semantic meaning but contrast tuned for daylight.
- **Typography:** large editorial headlines balanced against compact monospaced instrumentation labels, readable body text, and restrained numerical readouts.
- **Surfaces:** crisp hairline borders, meaningful elevation, purposeful spacing, and an instrument-like visualization well.
- **Motion:** interaction feedback only; preserve reduced-motion behavior, keyboard navigation, visible focus, and full workflow access without a mouse.
- **Integrity:** demo fixtures remain clearly illustrative. No visual indicator may imply proven novelty, synchronized data, verified metadata, or a real AI analysis if none exists.

## Milestones

### 01 — Visual foundation (this pull request)
- [x] Semantic, contrast-aware theme tokens and distinctive light/dark experiences.
- [x] Reworked brand, navigation, topbar, search, overview hero, surfaces and data readouts.
- [x] Visible appearance control on mobile and persistence smoke tests.
- [x] Preserve the existing browser-local research workflows without storage-schema changes.
- [ ] Manual visual signoff on wide desktop, laptop, tablet, and narrow mobile preview.

### 02 — True spatial knowledge map (next release)
- [ ] Replace the perspective SVG graph with actual 3D scene rendering and camera controls; label it accurately.
- [ ] Derive spatial entities and links directly from the current paper-to-gap evidence model.
- [ ] Design spatial layers for source papers, candidate questions, and observed links rather than decorative particles.
- [ ] Add selection, zoom, orbit, fit, focus, and a controlled inspector handoff.
- [ ] Provide a lightweight 2D/list fallback for no WebGL, reduced motion, assistive tech, and low-powered devices.
- [ ] Test resize, graph selection, performance, and both visual themes on desktop/mobile.

### 03 — Literature library
- [ ] Reimagine scanning, filtering, reading state, citations/provenance, and paper inspector.
- [ ] Keep manual source metadata clearly distinct from verified source records.

### 04 — Gap investigation
- [ ] Evidence trails, competing explanations, missing support, shortlist and confidence language.
- [ ] Use direct links to evidence rather than inflated AI-derived scores.

### 05 — Experiment studio
- [ ] Transform hypothesis/baseline/metric/status editing into an experiment canvas.
- [ ] Keep the data model coherent and allow manual edits without losing records.

### 06 — Interaction and release quality
- [ ] Harmonize responsive layouts, accessibility, transitions, empty states, and contextual onboarding.
- [ ] Run UI regression, storage migration/import checks, mobile and keyboard audits, and production preview signoff.

## Release standard

Changes are developed in a feature branch. A milestone is not merged based on code review alone: GitHub CI, browser smoke tests, Vercel preview, contrast/keyboard/manual visual review, and intentional acceptance must all pass. A green build alone cannot certify visual quality. The production `main` branch remains stable between milestones.

## Visual review package

Every browser smoke run captures four screenshots from seeded *illustrative* research records:

1. Night Lab at 1440 × 900.
2. Daylight Lab at 1440 × 900.
3. Night Lab at 390 × 844.
4. Daylight Lab at 390 × 844.

In GitHub Actions, open the latest successful **Re:Gap Browser Smoke** run, scroll to **Artifacts**, and download **observatory-visual-qa**. Screenshots are kept for 14 days. Review the screenshots alongside the Vercel preview in an actual browser: screenshots are reference evidence, not approval of responsive behavior or accessibility.
