export type Paper = {
	id: string;
	title: string;
	authors: string;
	year: number;
	venue: string;
	summary: string;
	limitation: string;
	doi?: string;
};

export type Gap = {
	id: string;
	title: string;
	confidence: "Needs validation" | "Evidence reviewed";
	description: string;
	sourceIds: string[];
	nextStep: string;
};

// These records are fictional and exist only for frontend testing.
export const demoPapers: Paper[] = [
	{
		id: "paper-1",
		title: "Memory-Aware Scheduling for Large Model Inference",
		authors: "Demo Authors",
		year: 2025,
		venue: "Illustrative preprint",
		summary:
			"Explores memory-aware scheduling for inference under constrained GPU resources.",
		limitation:
			"The evaluation covers a narrow set of workloads and does not test dynamic memory pressure.",
	},
	{
		id: "paper-2",
		title: "Adaptive Batching Under Irregular Workloads",
		authors: "Demo Authors",
		year: 2024,
		venue: "Illustrative conference paper",
		summary: "Proposes batching decisions driven by request arrival patterns.",
		limitation:
			"Interactions between batching and memory paging are outside the evaluation.",
	},
	{
		id: "paper-3",
		title: "A Survey of GPU Inference Optimizations",
		authors: "Demo Authors",
		year: 2026,
		venue: "Illustrative survey",
		summary:
			"Organizes optimization methods into scheduling, caching, and execution groups.",
		limitation:
			"The survey does not experimentally compare combined approaches.",
	},
];

export const demoGaps: Gap[] = [
	{
		id: "gap-1",
		title: "Joint scheduling and memory management",
		confidence: "Needs validation",
		description:
			"Potentially underexplored interaction between adaptive batching and dynamic GPU memory pressure.",
		sourceIds: ["paper-1", "paper-2"],
		nextStep:
			"Search for papers that jointly evaluate batching, paging, and scheduling before treating this as novel.",
	},
	{
		id: "gap-2",
		title: "Comparable evaluations across optimization families",
		confidence: "Needs validation",
		description:
			"Existing studies may not compare combinations under consistent workloads and metrics.",
		sourceIds: ["paper-2", "paper-3"],
		nextStep:
			"Define common latency, throughput, and memory metrics; seek counterexamples.",
	},
];
