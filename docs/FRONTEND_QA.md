# Re:Gap frontend QA checklist

This checklist complements automated tests. It does not certify that all possible
bugs have been found.

## Automated checks

Run these commands before merging a frontend pull request:

```bash
pnpm install --frozen-lockfile
pnpm test:unit
pnpm check-types
pnpm exec turbo run build --filter=web
pnpm exec biome ci .
```

The `Re:Gap Browser Smoke` workflow also runs real Chromium checks for core
desktop/mobile flows, source records, shortlisting, experiment planning,
browser persistence, and JSON export/import.

## Manual acceptance checklist

- [ ] Check desktop layouts at 1280px, 1440px, and 1920px; no overlapping panels or clipped controls
- [ ] Check mobile layouts at 320px, 390px, and 768px; no horizontal overflow
- [ ] Verify dark/light contrast, keyboard focus rings, and reduced-motion preferences
- [ ] Orbit, zoom, reset, and keyboard-rotate the perspective research graph
- [ ] Open paper and gap nodes and follow linked evidence in both directions
- [ ] Add a paper with and without DOI/source URL; verify invalid URL/DOI rejection
- [ ] Search and sort the literature collection; confirm saved data after reload
- [ ] Create a custom gap from at least one paper; reject creation with no linked sources
- [ ] Shortlist/unshortlist a gap and confirm the shortlist-only filter
- [ ] Create an experiment, change its status, and verify persistence after reload
- [ ] Confirm deletion guards protect evidence-linked papers and active experiment gaps
- [ ] Export JSON, clear a local test record, import JSON, and confirm data restoration
- [ ] Reject malformed JSON, oversized backups, invalid URLs, and broken references
- [ ] Verify modal Tab/Shift+Tab, Escape dismissal, and focus restoration
- [ ] Verify mobile navigation and inspector overlays do not block subsequent actions

## Important scope

- The included example literature and research gaps are fictional fixtures.
- No paper is automatically verified against a DOI database.
- Data is saved per browser, not shared between collaborators.
- The research graph is perspective projected, not a WebGL scene.
- Automated and manual checks reduce risk, but cannot guarantee zero defects.
