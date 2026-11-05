import test from "node:test";
import assert from "node:assert/strict";

import {
	doiUrl,
	isAppearance,
	isExperimentList,
	isGapList,
	isHttpUrl,
	isPaperList,
	isSavedIdList,
	paperSourceUrl,
	parseWorkspaceExport,
} from "./research-data.ts";

const paper = {
	id: "manual-p1",
	title: "GPU scheduling under memory pressure",
	authors: "Researcher",
	year: 2026,
	venue: "Local draft",
	summary: "A verified abstract will be supplied later.",
	limitation: "Not yet assessed.",
	doi: "10.1000/test.2026",
	url: "https://example.org/paper",
};

const gap = {
	id: "gap-custom-1",
	title: "Latency versus paging",
	description: "A proposed relationship to investigate.",
	nextStep: "Compare representative prior systems and baselines.",
	confidence: "Needs validation",
	sourceIds: ["manual-p1"],
};

const experiment = {
	id: "experiment-1",
	gapId: "gap-custom-1",
	title: "Compare memory-aware scheduling",
	hypothesis: "P95 latency should fall under memory pressure.",
	baseline: "Static scheduling",
	metric: "P95 latency (ms)",
	status: "planned",
	createdAt: "2026-11-05T12:00:00.000Z",
};

function backup(overrides = {}) {
	return {
		format: "regap-local-export",
		version: 1,
		exportedAt: "2026-11-06T00:00:00.000Z",
		customPapers: [paper],
		customGaps: [gap],
		savedGapIds: ["gap-custom-1"],
		experiments: [experiment],
		...overrides,
	};
}

test("valid saved research data is accepted", () => {
	assert.equal(isPaperList([paper]), true);
	assert.equal(isGapList([gap]), true);
	assert.equal(isExperimentList([experiment]), true);
	assert.equal(isSavedIdList(["gap-custom-1"]), true);
	assert.equal(isAppearance("dark"), true);
	assert.equal(isAppearance("sepia"), false);
});

test("malformed and duplicate persisted state is rejected before rendering", () => {
	for (const value of [null, {}, "[]", [{ title: "invalid" }]]) {
		assert.equal(isPaperList(value), false);
		assert.equal(isGapList(value), false);
		assert.equal(isExperimentList(value), false);
	}
	assert.equal(isPaperList([paper, { ...paper }]), false);
	assert.equal(isGapList([gap, { ...gap }]), false);
	assert.equal(isExperimentList([experiment, { ...experiment }]), false);
	assert.equal(isSavedIdList(["gap-1", "gap-1"]), false);
	assert.equal(isSavedIdList([1, "gap-1"]), false);
});

test("unknown protocols and malformed DOIs cannot become active links", () => {
	assert.equal(isHttpUrl("https://example.org/paper"), true);
	assert.equal(isHttpUrl("http://example.org/paper"), true);
	assert.equal(isHttpUrl("javascript:alert(1)"), false);
	assert.equal(isHttpUrl("data:text/html,test"), false);
	assert.equal(isHttpUrl("not a URL"), false);
	assert.equal(doiUrl("bad DOI"), null);
	assert.equal(doiUrl("10.1234/valid.paper"), "https://doi.org/10.1234/valid.paper");
	assert.equal(
		doiUrl("10.1234/ab/cd"),
		"https://doi.org/10.1234/ab/cd",
	);
	assert.equal(paperSourceUrl(paper), paper.url);
	assert.equal(
		paperSourceUrl({ ...paper, url: undefined }),
		"https://doi.org/10.1000/test.2026",
	);
	assert.equal(
		paperSourceUrl({ ...paper, url: "javascript:bad", doi: undefined }),
		null,
	);
});

test("valid backup restores user-created papers, gaps and experiments", () => {
	assert.deepEqual(parseWorkspaceExport(backup()), backup());
	assert.deepEqual(
		parseWorkspaceExport(
			backup({ customPapers: [], customGaps: [], savedGapIds: [], experiments: [] }),
		),
		backup({ customPapers: [], customGaps: [], savedGapIds: [], experiments: [] }),
	);
});

test("missing or invalid backup fields are rejected", () => {
	for (const payload of [
		null,
		[],
		backup({ format: "untrusted" }),
		backup({ version: 7 }),
		backup({ customPapers: null }),
		backup({ customGaps: "not an array" }),
		backup({ experiments: [{ ...experiment, status: "unknown" }] }),
		backup({ savedGapIds: ["gap-custom-1", "gap-custom-1"] }),
	]) {
		assert.throws(() => parseWorkspaceExport(payload));
	}
});

test("backups with broken paper or gap links cannot be imported", () => {
	assert.throws(() =>
		parseWorkspaceExport(
			backup({ customGaps: [{ ...gap, sourceIds: ["manual-missing"] }] }),
		),
		/missing paper/,
	);
	assert.throws(() =>
		parseWorkspaceExport(
			backup({ experiments: [{ ...experiment, gapId: "gap-custom-missing" }] }),
		),
		/missing gap/,
	);
	assert.throws(() =>
		parseWorkspaceExport(backup({ savedGapIds: ["gap-custom-missing"] })),
		/missing shortlisted gap/,
	);
});

test("demo fixture IDs can be resolved without importing the fixtures", () => {
	const builtInGap = { ...gap, sourceIds: ["paper-1"] };
	const plan = { ...experiment, gapId: "gap-1" };
	assert.doesNotThrow(() =>
		parseWorkspaceExport(
			backup({ customPapers: [], customGaps: [builtInGap], experiments: [plan] }),
			["paper-1"],
			["gap-1"],
		),
	);
});

test("legacy orphaned gaps are preserved for manual recovery", () => {
	assert.equal(isGapList([{ ...gap, sourceIds: [] }]), true);
});
