import type { Gap, Paper } from "./demo-data";

export type ExperimentStatus = "planned" | "in-progress" | "complete";

export type Experiment = {
	id: string;
	gapId: string;
	title: string;
	hypothesis: string;
	baseline: string;
	metric: string;
	status: ExperimentStatus;
	createdAt: string;
};

export type WorkspaceExport = {
	format: "regap-local-export";
	version: 1;
	exportedAt: string;
	customPapers: Paper[];
	customGaps: Gap[];
	savedGapIds: string[];
	experiments: Experiment[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasText(value: unknown, maxLength = 2000): value is string {
	return (
		typeof value === "string" &&
		value.trim().length > 0 &&
		value.length <= maxLength
	);
}

function hasOptionalText(value: unknown, maxLength = 2000): boolean {
	return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function hasUniqueIds(items: Array<{ id: string }>): boolean {
	return new Set(items.map((item) => item.id)).size === items.length;
}

export function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}

export function doiUrl(doi: string): string | null {
	const trimmed = doi.trim();
	if (!/^10\.\d{4,9}\/\S+$/i.test(trimmed) || trimmed.length > 300)
		return null;

	const segments = trimmed.split("/");
	return `https://doi.org/${segments.map(encodeURIComponent).join("/")}`;
}

export function paperSourceUrl(paper: Paper): string | null {
	if (paper.url && isHttpUrl(paper.url)) return paper.url;
	return paper.doi ? doiUrl(paper.doi) : null;
}

export function isPaper(value: unknown): value is Paper {
	if (!isRecord(value)) return false;
	return (
		hasText(value.id, 150) &&
		value.id.startsWith("manual-") &&
		hasText(value.title, 300) &&
		hasText(value.authors, 500) &&
		Number.isInteger(value.year) &&
		(value.year as number) >= 1900 &&
		(value.year as number) <= 2100 &&
		hasText(value.venue, 300) &&
		hasText(value.summary, 10000) &&
		hasText(value.limitation, 2000) &&
		hasOptionalText(value.doi, 300) &&
		hasOptionalText(value.url, 1200) &&
		(value.url === undefined ||
			(typeof value.url === "string" && isHttpUrl(value.url)))
	);
}

export function isGap(value: unknown): value is Gap {
	if (!isRecord(value)) return false;
	return (
		hasText(value.id, 150) &&
		value.id.startsWith("gap-custom-") &&
		hasText(value.title, 200) &&
		hasText(value.description, 1500) &&
		hasText(value.nextStep, 1000) &&
		value.confidence === "Needs validation" &&
		Array.isArray(value.sourceIds) &&
		value.sourceIds.length <= 100 &&
		value.sourceIds.every((id: unknown) => hasText(id, 150)) &&
		new Set(value.sourceIds).size === value.sourceIds.length
	);
}

export function isExperiment(value: unknown): value is Experiment {
	if (!isRecord(value)) return false;
	return (
		hasText(value.id, 150) &&
		value.id.startsWith("experiment-") &&
		hasText(value.gapId, 150) &&
		hasText(value.title, 300) &&
		hasText(value.hypothesis, 2000) &&
		hasText(value.baseline, 1000) &&
		hasText(value.metric, 1000) &&
		(value.status === "planned" ||
			value.status === "in-progress" ||
			value.status === "complete") &&
		hasText(value.createdAt, 50) &&
		!Number.isNaN(Date.parse(value.createdAt))
	);
}

export function isPaperList(value: unknown): value is Paper[] {
	return (
		Array.isArray(value) &&
		value.length <= 1000 &&
		value.every(isPaper) &&
		hasUniqueIds(value)
	);
}

export function isGapList(value: unknown): value is Gap[] {
	return (
		Array.isArray(value) &&
		value.length <= 1000 &&
		value.every(isGap) &&
		hasUniqueIds(value)
	);
}

export function isExperimentList(value: unknown): value is Experiment[] {
	return (
		Array.isArray(value) &&
		value.length <= 2000 &&
		value.every(isExperiment) &&
		hasUniqueIds(value)
	);
}

export function isSavedIdList(value: unknown): value is string[] {
	return (
		Array.isArray(value) &&
		value.length <= 2000 &&
		value.every((id: unknown) => hasText(id, 150)) &&
		new Set(value).size === value.length
	);
}

export function isAppearance(value: unknown): value is "light" | "dark" {
	return value === "light" || value === "dark";
}

export function parseWorkspaceExport(
	input: unknown,
	builtInPaperIds: string[] = [],
	builtInGapIds: string[] = [],
): WorkspaceExport {
	if (
		!isRecord(input) ||
		input.format !== "regap-local-export" ||
		input.version !== 1 ||
		!hasText(input.exportedAt, 50) ||
		!isPaperList(input.customPapers) ||
		!isGapList(input.customGaps) ||
		!isSavedIdList(input.savedGapIds) ||
		!isExperimentList(input.experiments)
	) {
		throw new Error("This is not a valid Re:Gap version 1 backup.");
	}

	const paperIds = new Set([
		...builtInPaperIds,
		...input.customPapers.map((paper) => paper.id),
	]);
	const gapIds = new Set([
		...builtInGapIds,
		...input.customGaps.map((gap) => gap.id),
	]);

	if (
		input.customGaps.some((gap) =>
			gap.sourceIds.some((sourceId) => !paperIds.has(sourceId)),
		)
	) {
		throw new Error("The backup contains a research gap with a missing paper.");
	}
	if (input.experiments.some((experiment) => !gapIds.has(experiment.gapId))) {
		throw new Error("The backup contains an experiment with a missing gap.");
	}
	if (input.savedGapIds.some((id) => !gapIds.has(id))) {
		throw new Error("The backup references a missing shortlisted gap.");
	}

	return input as WorkspaceExport;
}
