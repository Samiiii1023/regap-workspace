"use client";

import {
	BookOpen,
	ChevronRight,
	CircleHelp,
	FileSearch,
	FlaskConical,
	FolderOpen,
	Menu,
	Microscope,
	PanelRightClose,
	PanelRightOpen,
	Plus,
	Search,
	ShieldAlert,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";

import { demoGaps, demoPapers, type Gap, type Paper } from "@/lib/demo-data";

type View = "overview" | "library" | "gaps" | "experiments";

const navigationItems: {
	id: View;
	label: string;
	icon: typeof FolderOpen;
}[] = [
	{ id: "overview", label: "Overview", icon: FolderOpen },
	{ id: "library", label: "Paper library", icon: BookOpen },
	{ id: "gaps", label: "Gap candidates", icon: FileSearch },
	{ id: "experiments", label: "Experiments", icon: FlaskConical },
];

export function ResearchWorkspace() {
	const [view, setView] = useState<View>("overview");
	const [query, setQuery] = useState("");
	const [selectedPaperId, setSelectedPaperId] = useState<string | null>(
		"paper-1",
	);
	const [paperSort, setPaperSort] = useState<"newest" | "oldest" | "title">(
		"newest",
	);
	const [inspectorOpen, setInspectorOpen] = useState(true);
	const [menuOpen, setMenuOpen] = useState(false);
	const [savedGapIds, setSavedGapIds] = usePersistentState<string[]>(
		"regap:saved-gaps:v1",
		[],
	);
	const [customPapers, setCustomPapers, papersReady] = usePersistentState<
		Paper[]
	>("regap:papers:v1", []);
	const [showAddPaper, setShowAddPaper] = useState(false);

	const [newPaperTitle, setNewPaperTitle] = useState("");
	const [newPaperAuthors, setNewPaperAuthors] = useState("");

	const papers = useMemo(
		() => [...customPapers, ...demoPapers],
		[customPapers],
	);

	const selectedPaper = papers.find((paper) => paper.id === selectedPaperId);

	const filteredPapers = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		const results = papers.filter((paper) =>
			`${paper.title} ${paper.authors} ${paper.summary}`
				.toLowerCase()
				.includes(normalizedQuery),
		);

		return [...results].sort((a, b) => {
			switch (paperSort) {
				case "newest":
					return b.year - a.year;

				case "oldest":
					return a.year - b.year;

				case "title":
					return a.title.localeCompare(b.title);

				default:
					return 0;
			}
		});
	}, [papers, query, paperSort]);

	const filteredGaps = demoGaps.filter((gap) =>
		`${gap.title} ${gap.description}`
			.toLowerCase()
			.includes(query.toLowerCase()),
	);

	function activate(next: View) {
		setView(next);
		setMenuOpen(false);
		setQuery("");
	}

	function openPaper(id: string) {
		setSelectedPaperId(id);
		setInspectorOpen(true);
	}

	function addPaper(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const title = newPaperTitle.trim();

		if (!title) return;

		const paper: Paper = {
			id: `manual-${Date.now()}`,
			title,
			authors: newPaperAuthors.trim() || "Unknown authors",
			year: new Date().getFullYear(),
			venue: "Manually added",
			summary:
				"Add an abstract and verified source metadata in a later iteration.",
			limitation: "Not assessed.",
		};

		setCustomPapers((previous) => [paper, ...previous]);
		setNewPaperTitle("");
		setNewPaperAuthors("");
		setShowAddPaper(false);

		activate("library");
		openPaper(paper.id);
	}

	function deletePaper(id: string) {
		const paper = customPapers.find((item) => item.id === id);

		if (!paper) return;

		const confirmed = window.confirm(
			`Remove "${paper.title}" from your library?`,
		);

		if (!confirmed) return;

		setCustomPapers((previous) => previous.filter((item) => item.id !== id));

		if (selectedPaperId === id) {
			setSelectedPaperId(null);
		}
	}

	function PaperCard({ paper }: { paper: Paper }) {
		const selected = selectedPaperId === paper.id;

		return (
			<button
				type="button"
				onClick={() => openPaper(paper.id)}
				className={`w-full rounded-xl border p-4 text-left transition
          hover:border-violet-300 hover:bg-violet-50/40
          dark:hover:bg-violet-900/10
          ${
						selected
							? "border-violet-300 bg-violet-50/60 dark:bg-violet-950/20"
							: "border-border bg-card"
					}`}
			>
				<div className="mb-2 flex items-center justify-between gap-3">
					<span className="text-xs text-muted-foreground">
						{paper.venue} · {paper.year}
					</span>
					<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
				</div>

				<h3 className="text-sm font-semibold leading-snug">{paper.title}</h3>

				<p className="mt-1 text-xs text-muted-foreground">{paper.authors}</p>

				<p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
					{paper.summary}
				</p>
			</button>
		);
	}

	function GapCard({ gap }: { gap: Gap }) {
		const saved = savedGapIds.includes(gap.id);

		return (
			<article className="rounded-xl border border-border bg-card p-5">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
						{gap.confidence}
					</span>

					<span className="text-xs text-muted-foreground">
						{gap.sourceIds.length} linked sources
					</span>
				</div>

				<h3 className="mt-4 font-semibold">{gap.title}</h3>

				<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
					{gap.description}
				</p>

				<div className="mt-4 rounded-lg bg-muted/70 p-3">
					<p className="text-xs font-semibold uppercase tracking-wide">
						Validation task
					</p>

					<p className="mt-1 text-sm text-muted-foreground">{gap.nextStep}</p>
				</div>

				<div className="mt-4 flex flex-wrap gap-2">
					{gap.sourceIds.map((id) => {
						const paper = papers.find((item) => item.id === id);

						if (!paper) return null;

						return (
							<button
								key={id}
								type="button"
								onClick={() => openPaper(id)}
								className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
							>
								View source: {id.replace("paper-", "#")}
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={() =>
						setSavedGapIds((previous) =>
							previous.includes(gap.id)
								? previous.filter((id) => id !== gap.id)
								: [...previous, gap.id],
						)
					}
					className="mt-4 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
				>
					{saved ? "Remove from shortlist" : "Save to shortlist"}
				</button>
			</article>
		);
	}

	return (
		<div className="flex min-h-screen bg-background text-foreground">
			{/* Mobile navigation backdrop */}
			{menuOpen && (
				<button
					type="button"
					aria-label="Close navigation"
					className="fixed inset-0 z-20 bg-black/30 lg:hidden"
					onClick={() => setMenuOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`${
					menuOpen ? "translate-x-0" : "-translate-x-full"
				} fixed inset-y-0 left-0 z-30 flex w-64 flex-col
          border-r border-border bg-card p-4 transition-transform
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
			>
				<div className="mb-10 flex items-center justify-between px-2 pt-2">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
							<Microscope size={20} />
						</div>
						<span className="text-xl font-bold tracking-tight">Re:Gap</span>
					</div>

					<button
						type="button"
						className="lg:hidden"
						aria-label="Close sidebar"
						onClick={() => setMenuOpen(false)}
					>
						<X size={20} />
					</button>
				</div>

				<p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Research workspace
				</p>

				<nav aria-label="Main navigation" className="space-y-1">
					{navigationItems.map((item) => {
						const Icon = item.icon;

						return (
							<button
								key={item.id}
								type="button"
								onClick={() => activate(item.id)}
								aria-current={view === item.id ? "page" : undefined}
								className={`flex w-full items-center gap-3 rounded-lg
                  px-3 py-2.5 text-left text-sm font-medium
                  ${
										view === item.id
											? "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100"
											: "text-muted-foreground hover:bg-muted hover:text-foreground"
									}`}
							>
								<Icon size={18} />
								{item.label}
							</button>
						);
					})}
				</nav>

				<div className="mt-auto rounded-xl border border-border bg-muted/50 p-4">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<ShieldAlert size={16} />
						Evidence first
					</div>
					<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
						Demo gap candidates are hypotheses, not proven research
						contributions.
					</p>
				</div>

				<div className="mt-4 px-3 text-xs text-muted-foreground">
					Re:Gap · Frontend prototype
				</div>
			</aside>

			{/* Main application */}
			<main className="min-w-0 flex-1">
				<header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-5 backdrop-blur md:px-8">
					<div className="flex items-center gap-3">
						<button
							type="button"
							aria-label="Open navigation"
							onClick={() => setMenuOpen(true)}
							className="lg:hidden"
						>
							<Menu size={21} />
						</button>

						<span className="text-sm text-muted-foreground">Workspace</span>
						<ChevronRight size={15} className="text-muted-foreground" />
						<span className="text-sm font-medium">
							{navigationItems.find((item) => item.id === view)?.label}
						</span>
					</div>

					<button
						type="button"
						onClick={() => setInspectorOpen((previous) => !previous)}
						aria-label={
							inspectorOpen ? "Hide source inspector" : "Show source inspector"
						}
						className="rounded-lg border border-border p-2 hover:bg-muted"
					>
						{inspectorOpen ? (
							<PanelRightClose size={19} />
						) : (
							<PanelRightOpen size={19} />
						)}
					</button>
				</header>

				<div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
					{/* Page heading */}
					<div className="mb-8 flex flex-wrap items-start justify-between gap-4">
						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-600 dark:text-violet-300">
								Research intelligence
							</p>

							<h1 className="text-3xl font-bold tracking-tight md:text-4xl">
								{view === "overview"
									? "Explore research with evidence."
									: navigationItems.find((item) => item.id === view)?.label}
							</h1>

							<p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
								{view === "overview"
									? "Connect literature, inspect limitations, and test candidate research gaps against prior work."
									: view === "library"
										? "Review saved papers and inspect their supporting evidence."
										: view === "gaps"
											? "Explore candidate gaps and check whether the evidence supports them."
											: "Turn validated gaps into testable hypotheses and experiment plans."}
							</p>
						</div>

						<button
							type="button"
							disabled={!papersReady}
							onClick={() => setShowAddPaper(true)}
							className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
						>
							<Plus size={17} />
							Add paper
						</button>
					</div>

					{/* Overview */}
					{view === "overview" && (
						<>
							<div className="mb-8 grid gap-3 sm:grid-cols-3">
								{[
									{ label: "Papers in library", value: papers.length },
									{
										label: "Candidate gaps",
										value: demoGaps.length,
									},
									{
										label: "Shortlisted gaps",
										value: savedGapIds.length,
									},
								].map((metric) => (
									<div
										key={metric.label}
										className="rounded-xl border border-border bg-card p-5"
									>
										<p className="text-sm text-muted-foreground">
											{metric.label}
										</p>
										<p className="mt-2 text-3xl font-semibold tabular-nums">
											{metric.value}
										</p>
									</div>
								))}
							</div>

							<div className="mb-7 rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
								<div className="flex items-center gap-2 text-sm font-semibold">
									<CircleHelp size={17} />
									How Re:Gap works
								</div>

								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									Start from a collection of papers, examine stated limitations,
									identify a plausible unanswered question, then challenge it
									with additional literature before designing an experiment.
								</p>
							</div>

							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-xl font-semibold">Recent papers</h2>
								<button
									type="button"
									onClick={() => activate("library")}
									className="text-sm font-semibold text-violet-600 hover:underline"
								>
									View library →
								</button>
							</div>

							<div className="grid gap-3 xl:grid-cols-2">
								{papers.slice(0, 2).map((paper) => (
									<PaperCard key={paper.id} paper={paper} />
								))}
							</div>

							<div className="mb-4 mt-9 flex items-center justify-between">
								<h2 className="text-xl font-semibold">Gap candidates</h2>
								<button
									type="button"
									onClick={() => activate("gaps")}
									className="text-sm font-semibold text-violet-600 hover:underline"
								>
									Review gaps →
								</button>
							</div>

							<div className="grid gap-3 xl:grid-cols-2">
								{demoGaps.map((gap) => (
									<GapCard key={gap.id} gap={gap} />
								))}
							</div>
						</>
					)}

					{/* Paper library / gaps */}
					{(view === "library" || view === "gaps") && (
						<>
							{view === "library" && (
								<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
									<p className="text-sm text-muted-foreground">
										{filteredPapers.length} papers found
									</p>

									<label className="flex items-center gap-2 text-sm">
										<span className="text-muted-foreground">Sort by</span>

										<select
											value={paperSort}
											onChange={(event) =>
												setPaperSort(
													event.target.value as "newest" | "oldest" | "title",
												)
											}
											className="rounded-lg border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
										>
											<option value="newest">Newest first</option>
											<option value="oldest">Oldest first</option>
											<option value="title">Title A–Z</option>
										</select>
									</label>
								</div>
							)}

							<div className="relative mb-5">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

								<input
									aria-label={
										view === "library" ? "Search papers" : "Search gaps"
									}
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder={
										view === "library"
											? "Search titles, authors, and abstracts…"
											: "Search gap candidates…"
									}
									className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-violet-500"
								/>
							</div>

							<div className="grid gap-3 xl:grid-cols-2">
								{view === "library"
									? filteredPapers.map((paper) => (
											<PaperCard key={paper.id} paper={paper} />
										))
									: filteredGaps.map((gap) => (
											<GapCard key={gap.id} gap={gap} />
										))}
							</div>

							{(view === "library"
								? filteredPapers.length === 0
								: filteredGaps.length === 0) && (
								<p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
									No matching results. Try another search.
								</p>
							)}
						</>
					)}

					{/* Experiments */}
					{view === "experiments" && (
						<div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
							<FlaskConical className="mx-auto h-9 w-9 text-violet-500" />

							<h2 className="mt-4 text-lg font-semibold">
								Experiment planning comes next
							</h2>

							<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
								Shortlist a candidate gap and check its novelty before creating
								a hypothesis, experimental variables, baselines, and evaluation
								criteria.
							</p>

							<button
								type="button"
								onClick={() => activate("gaps")}
								className="mt-5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
							>
								Review candidate gaps
							</button>
						</div>
					)}
				</div>
			</main>

			{/* Source inspector */}
			{inspectorOpen && (
				<aside
					aria-label="Source inspector"
					className="hidden w-80 shrink-0 border-l border-border bg-card p-6 2xl:sticky 2xl:top-0 2xl:block 2xl:h-screen 2xl:overflow-y-auto"
				>
					<div className="mb-6 flex items-center justify-between">
						<h2 className="font-semibold">Source inspector</h2>
						<FileSearch size={19} className="text-muted-foreground" />
					</div>

					{selectedPaper ? (
						<>
							<p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
								Selected paper
							</p>

							<h3 className="mt-2 font-semibold leading-snug">
								{selectedPaper.title}
							</h3>

							<p className="mt-2 text-xs text-muted-foreground">
								{selectedPaper.authors} · {selectedPaper.year}
							</p>

							<div className="mt-7">
								<h4 className="text-sm font-semibold">Summary</h4>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									{selectedPaper.summary}
								</p>
							</div>

							<div className="mt-6">
								<h4 className="text-sm font-semibold">Potential limitation</h4>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									{selectedPaper.limitation}
								</p>
							</div>

							{selectedPaper.id.startsWith("manual-") && (
								<button
									type="button"
									onClick={() => deletePaper(selectedPaper.id)}
									className="mt-6 w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/20"
								>
									Remove paper
								</button>
							)}

							<p className="mt-8 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
								Illustrative demo content — not a real citation. Verify metadata
								and quote locations before producing research claims.
							</p>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							Select a paper to inspect.
						</p>
					)}
				</aside>
			)}

			{/* Add paper dialog */}
			{showAddPaper && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="add-paper-title"
						className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl"
					>
						<div className="mb-5 flex items-center justify-between">
							<h2 id="add-paper-title" className="text-lg font-semibold">
								Add a paper
							</h2>

							<button
								type="button"
								onClick={() => setShowAddPaper(false)}
								aria-label="Close add paper dialog"
							>
								<X size={20} />
							</button>
						</div>

						<p className="mb-5 text-sm text-muted-foreground">
							Prototype only. New papers remain in this browser session until
							the page reloads.
						</p>

						<form onSubmit={addPaper} className="space-y-4">
							<label className="block text-sm font-medium">
								Title
								<input
									required
									value={newPaperTitle}
									onChange={(event) => setNewPaperTitle(event.target.value)}
									className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-violet-500"
									placeholder="Paper title"
								/>
							</label>

							<label className="block text-sm font-medium">
								Authors
								<input
									value={newPaperAuthors}
									onChange={(event) => setNewPaperAuthors(event.target.value)}
									className="mt-2 w-full rounded-lg border border-border bg-background p-2.5 outline-none focus:ring-2 focus:ring-violet-500"
									placeholder="Author names"
								/>
							</label>

							<button
								type="submit"
								className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
							>
								Add to library
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
