"use client";

import {
	ArrowRight,
	ArrowUpRight,
	BookOpen,
	Bookmark,
	BookmarkCheck,
	Check,
	CheckCircle2,
	ChevronRight,
	CircleHelp,
	Command,
	Download,
	FileSearch,
	FlaskConical,
	FolderSearch,
	Layers3,
	Menu,
	Moon,
	MoreHorizontal,
	PanelRightClose,
	PanelRightOpen,
	Plus,
	Search,
	ShieldCheck,
	Sparkles,
	Sun,
	Target,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { demoGaps, demoPapers, type Gap, type Paper } from "@/lib/demo-data";
import { ResearchGraph } from "@/components/research-graph";

type View = "overview" | "library" | "gaps" | "experiments";
type Inspection = { kind: "paper" | "gap"; id: string };
type ExperimentStatus = "planned" | "in-progress" | "complete";

type Experiment = {
	id: string;
	gapId: string;
	title: string;
	hypothesis: string;
	baseline: string;
	metric: string;
	status: ExperimentStatus;
	createdAt: string;
};

const navigation = [
	{ id: "overview", label: "Overview", icon: Layers3 },
	{ id: "library", label: "Paper library", icon: BookOpen },
	{ id: "gaps", label: "Gap explorer", icon: FolderSearch },
	{ id: "experiments", label: "Experiments", icon: FlaskConical },
] as const;

const viewCopy: Record<View, { eyebrow: string; title: string; description: string }> = {
	overview: {
		eyebrow: "THE RESEARCH DESK",
		title: "Your next breakthrough starts with a better question.",
		description: "Follow the evidence from a paper to its limitations, uncover promising questions, and turn them into experiments.",
	},
	library: {
		eyebrow: "LITERATURE / 01",
		title: "A clearer view of the literature.",
		description: "Keep sources organized, revisit limitations, and connect what you have read.",
	},
	gaps: {
		eyebrow: "DISCOVERY / 02",
		title: "Explore what remains unanswered.",
		description: "Shortlist research questions, inspect their supporting papers, and challenge them before claiming novelty.",
	},
	experiments: {
		eyebrow: "VALIDATION / 03",
		title: "Turn questions into experiments.",
		description: "Document a falsifiable hypothesis, a baseline, and a measurable outcome for every proposed test.",
	},
};

function formatDate(value: string) {
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function PaperCard({
	paper,
	selected,
	onOpen,
}: {
	paper: Paper;
	selected: boolean;
	onOpen: (id: string) => void;
}) {
	return (
		<button
			type="button"
			className={`paper-card ${selected ? "paper-card--active" : ""}`}
			onClick={() => onOpen(paper.id)}
			aria-pressed={selected}
		>
			<span className="paper-card-head">
				<span className="paper-card-icon"><BookOpen size={17} /></span>
				<span className="paper-card-year">{paper.year}</span>
				<ArrowUpRight size={17} className="paper-card-arrow" />
			</span>
			<span className="paper-card-venue">{paper.venue}</span>
			<span className="paper-card-title">{paper.title}</span>
			<span className="paper-card-authors">{paper.authors}</span>
			<span className="paper-card-summary">{paper.summary}</span>
			<span className="paper-card-foot">
				<span>{paper.id.startsWith("manual-") ? "Your library" : "Illustrative source"}</span>
				<span>Inspect source <ChevronRight size={14} /></span>
			</span>
		</button>
	);
}

function GapCard({
	gap,
	saved,
	onOpen,
	onToggleSaved,
	onCreateExperiment,
	compact = false,
}: {
	gap: Gap;
	saved: boolean;
	onOpen: (id: string) => void;
	onToggleSaved: (id: string) => void;
	onCreateExperiment: (id: string) => void;
	compact?: boolean;
}) {
	return (
		<article className={`gap-card ${compact ? "gap-card--compact" : ""}`}>
			<div className="gap-card-top">
				<span className="status-pill"><span />{gap.confidence}</span>
				<span className="gap-source-count">{gap.sourceIds.length} linked sources</span>
			</div>
			<button type="button" className="gap-title-button" onClick={() => onOpen(gap.id)}>
				{gap.title} <ArrowUpRight size={17} />
			</button>
			<p className="gap-description">{gap.description}</p>
			{!compact && (
				<div className="validation-note">
					<Target size={17} />
					<div><strong>Next validation step</strong><span>{gap.nextStep}</span></div>
				</div>
			)}
			<div className="gap-actions">
				<button
					type="button"
					className={`quiet-button ${saved ? "quiet-button--saved" : ""}`}
					aria-pressed={saved}
					onClick={() => onToggleSaved(gap.id)}
				>
					{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
					{saved ? "Shortlisted" : "Shortlist"}
				</button>
				<button type="button" className="text-action" onClick={() => onCreateExperiment(gap.id)}>
					Plan a test <ArrowRight size={15} />
				</button>
			</div>
		</article>
	);
}

function EmptySearch({ query }: { query: string }) {
	return (
		<div className="empty-state">
			<Search size={27} />
			<h3>No results for “{query}”</h3>
			<p>Try a different title, author, research topic, or keyword.</p>
		</div>
	);
}

export function ImmersiveWorkspace() {
	const [view, setView] = useState<View>("overview");
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
	const [menuOpen, setMenuOpen] = useState(false);
	const [inspectorOpen, setInspectorOpen] = useState(false);
	const [inspection, setInspection] = useState<Inspection | null>({ kind: "paper", id: "paper-1" });
	const [showAddPaper, setShowAddPaper] = useState(false);
	const [showExperimentForm, setShowExperimentForm] = useState(false);
	const [appearance, setAppearance] = usePersistentState<"dark" | "light">("regap:appearance:v1", "dark");
	const [savedGapIds, setSavedGapIds] = usePersistentState<string[]>("regap:saved-gaps:v1", []);
	const [customPapers, setCustomPapers, papersReady] = usePersistentState<Paper[]>("regap:papers:v1", []);
	const [experiments, setExperiments] = usePersistentState<Experiment[]>("regap:experiments:v1", []);
	const [newPaperTitle, setNewPaperTitle] = useState("");
	const [newPaperAuthors, setNewPaperAuthors] = useState("");
	const [newPaperYear, setNewPaperYear] = useState(String(new Date().getFullYear()));
	const [newPaperVenue, setNewPaperVenue] = useState("");
	const [newPaperSummary, setNewPaperSummary] = useState("");
	const [experimentGapId, setExperimentGapId] = useState(demoGaps[0]?.id ?? "");
	const [experimentTitle, setExperimentTitle] = useState("");
	const [experimentHypothesis, setExperimentHypothesis] = useState("");
	const [experimentBaseline, setExperimentBaseline] = useState("");
	const [experimentMetric, setExperimentMetric] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);
	const paperTitleRef = useRef<HTMLInputElement>(null);
	const experimentTitleRef = useRef<HTMLInputElement>(null);

	const papers = useMemo(() => [...customPapers, ...demoPapers], [customPapers]);
	const normalizedQuery = query.trim().toLowerCase();
	const filteredPapers = useMemo(() => {
		return papers
			.filter((paper) => `${paper.title} ${paper.authors} ${paper.summary} ${paper.venue}`.toLowerCase().includes(normalizedQuery))
			.sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "oldest" ? a.year - b.year : b.year - a.year);
	}, [papers, normalizedQuery, sort]);
	const filteredGaps = demoGaps.filter((gap) => `${gap.title} ${gap.description} ${gap.nextStep}`.toLowerCase().includes(normalizedQuery));
	const filteredExperiments = experiments.filter((experiment) => `${experiment.title} ${experiment.hypothesis} ${experiment.metric}`.toLowerCase().includes(normalizedQuery));
	const selectedPaper = inspection?.kind === "paper" ? papers.find((paper) => paper.id === inspection.id) : undefined;
	const selectedGap = inspection?.kind === "gap" ? demoGaps.find((gap) => gap.id === inspection.id) : undefined;
	const shortlistedGaps = demoGaps.filter((gap) => savedGapIds.includes(gap.id));

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			const element = event.target;
			const typing = element instanceof HTMLElement && (element.matches("input,textarea,select") || element.isContentEditable);
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				searchRef.current?.focus();
			}
			if (event.key === "/" && !typing) {
				event.preventDefault();
				searchRef.current?.focus();
			}
			if (event.key === "Escape") {
				setShowAddPaper(false);
				setShowExperimentForm(false);
				setMenuOpen(false);
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	useEffect(() => {
		if (showAddPaper) paperTitleRef.current?.focus();
	}, [showAddPaper]);

	useEffect(() => {
		if (showExperimentForm) experimentTitleRef.current?.focus();
	}, [showExperimentForm]);

	function navigate(next: View) {
		setView(next);
		setQuery("");
		setMenuOpen(false);
	}

	function inspectPaper(id: string) {
		setInspection({ kind: "paper", id });
		setInspectorOpen(true);
	}

	function inspectGap(id: string) {
		setInspection({ kind: "gap", id });
		setInspectorOpen(true);
	}

	function toggleSavedGap(id: string) {
		setSavedGapIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
	}

	function startExperiment(id?: string) {
		setExperimentGapId(id ?? shortlistedGaps[0]?.id ?? demoGaps[0]?.id ?? "");
		setExperimentTitle("");
		setExperimentHypothesis("");
		setExperimentBaseline("");
		setExperimentMetric("");
		setShowExperimentForm(true);
	}

	function addPaper(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const title = newPaperTitle.trim();
		if (!title) return;
		const year = Number(newPaperYear);
		if (!Number.isInteger(year) || year < 1900 || year > 2100) return;
		const paper: Paper = {
			id: `manual-${crypto.randomUUID()}`,
			title,
			authors: newPaperAuthors.trim() || "Unknown authors",
			year,
			venue: newPaperVenue.trim() || "Added manually",
			summary: newPaperSummary.trim() || "No abstract has been added yet.",
			limitation: "Not yet assessed. Read the source before identifying a limitation.",
		};
		setCustomPapers((previous) => [paper, ...previous]);
		setNewPaperTitle("");
		setNewPaperAuthors("");
		setNewPaperVenue("");
		setNewPaperSummary("");
		setShowAddPaper(false);
		navigate("library");
		inspectPaper(paper.id);
	}

	function deletePaper(id: string) {
		const paper = customPapers.find((item) => item.id === id);
		if (!paper || !window.confirm(`Remove “${paper.title}” from your local library?`)) return;
		setCustomPapers((previous) => previous.filter((item) => item.id !== id));
		setInspection(null);
		setInspectorOpen(false);
	}

	function addExperiment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!experimentTitle.trim() || !experimentHypothesis.trim() || !experimentBaseline.trim() || !experimentMetric.trim() || !demoGaps.some((gap) => gap.id === experimentGapId)) return;
		const experiment: Experiment = {
			id: `experiment-${crypto.randomUUID()}`,
			gapId: experimentGapId,
			title: experimentTitle.trim(),
			hypothesis: experimentHypothesis.trim(),
			baseline: experimentBaseline.trim(),
			metric: experimentMetric.trim(),
			status: "planned",
			createdAt: new Date().toISOString(),
		};
		setExperiments((previous) => [experiment, ...previous]);
		setShowExperimentForm(false);
		navigate("experiments");
	}

	function updateExperimentStatus(id: string, status: ExperimentStatus) {
		setExperiments((previous) => previous.map((experiment) => experiment.id === id ? { ...experiment, status } : experiment));
	}

	function removeExperiment(id: string) {
		if (!window.confirm("Delete this experiment plan?")) return;
		setExperiments((previous) => previous.filter((experiment) => experiment.id !== id));
	}

	function exportWorkspace() {
		const data = {
			format: "regap-local-export",
			version: 1,
			exportedAt: new Date().toISOString(),
			customPapers,
			savedGapIds,
			experiments,
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "regap-workspace.json";
		link.click();
		URL.revokeObjectURL(url);
	}

	const content = viewCopy[view];

	return (
		<div className={`regap-app ${appearance === "light" ? "regap-light" : ""}`}>
			{menuOpen && <button type="button" className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
			<div className="regap-layout">
				<aside className={`regap-sidebar ${menuOpen ? "regap-sidebar--open" : ""}`}>
					<div className="brand-row">
						<div className="brand-mark" aria-hidden="true"><span>R</span><b>:</b></div>
						<div className="brand-name">re<span>:</span>gap<small>RESEARCH INTELLIGENCE</small></div>
						<button type="button" className="sidebar-mobile-close icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button>
					</div>
					<div className="workspace-switcher">
						<div className="workspace-switcher-icon"><Sparkles size={18} /></div>
						<div><strong>My research space</strong><span>Personal workspace</span></div>
						<ChevronRight size={16} />
					</div>
					<p className="sidebar-section-label">WORKSPACE</p>
					<nav aria-label="Main navigation" className="sidebar-navigation">
						{navigation.map((item) => {
							const Icon = item.icon;
							return (
								<button key={item.id} type="button" aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)} className={`sidebar-link ${view === item.id ? "sidebar-link--current" : ""}`}>
									<Icon size={19} />
									<span>{item.label}</span>
									{item.id === "gaps" && savedGapIds.length > 0 && <small>{savedGapIds.length}</small>}
									{item.id === "experiments" && experiments.length > 0 && <small>{experiments.length}</small>}
								</button>
							);
						})}
					</nav>
					<div className="sidebar-divider" />
					<p className="sidebar-section-label">QUICK ACCESS</p>
					<div className="sidebar-navigation">
						<button type="button" className="sidebar-link" onClick={() => navigate("gaps")}><Bookmark size={19} /><span>Shortlisted gaps</span><small>{savedGapIds.length}</small></button>
						<button type="button" className="sidebar-link" onClick={exportWorkspace}><Download size={19} /><span>Export workspace</span></button>
					</div>
					<div className="sidebar-spacer" />
					<div className="sidebar-feature">
						<div className="sidebar-feature-orb"><Sparkles size={20} /></div>
						<strong>Good research asks better questions.</strong>
						<p>Every candidate gap is a hypothesis until the evidence is checked.</p>
						<button type="button" onClick={() => navigate("gaps")}>Explore candidates <ArrowUpRight size={14} /></button>
					</div>
					<div className="sidebar-footer"><span className="footer-avatar">R</span><div><strong>Re:Gap workspace</strong><span>Local prototype · Demo data</span></div><MoreHorizontal size={18} /></div>
				</aside>

				<div className="regap-content-column">
					<header className="regap-topbar">
						<div className="topbar-crumb">
							<button type="button" className="mobile-menu-button icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
							<span>Workspace</span><ChevronRight size={14} /><strong>{navigation.find((item) => item.id === view)?.label}</strong>
						</div>
						<div className="topbar-actions">
							<label className="global-search"><Search size={17} /><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search current section" placeholder="Search your workspace..." /><span><Command size={12} /> K</span></label>
							<button type="button" className="icon-button header-control" title="Toggle appearance" aria-label={appearance === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setAppearance((previous) => previous === "dark" ? "light" : "dark")}>{appearance === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
							<button type="button" className="icon-button header-control" title="Toggle inspector" aria-label={inspectorOpen ? "Hide inspector" : "Show inspector"} onClick={() => setInspectorOpen((previous) => !previous)}>{inspectorOpen ? <PanelRightClose size={19} /> : <PanelRightOpen size={19} />}</button>
							<button type="button" className="topbar-avatar" aria-label="My research workspace" onClick={() => navigate("overview")}>RG</button>
						</div>
					</header>

					<main className="regap-main">
						<div className="section-heading">
							<div><p className="eyebrow"><span className="eyebrow-line" />{content.eyebrow}</p><h1>{view === "overview" ? <>Ideas deserve <em>evidence.</em></> : content.title}</h1><p className="section-description">{content.description}</p></div>
							<div className="section-action">
								{view === "experiments" ? (
									<button type="button" className="primary-button" onClick={() => startExperiment()}><Plus size={17} /> New experiment</button>
								) : (
									<button type="button" className="primary-button" disabled={!papersReady} onClick={() => setShowAddPaper(true)}><Plus size={17} /> Add a paper</button>
								)}
							</div>
						</div>

						{view === "overview" && (
							<>
								<div className="overview-hero">
									<div className="hero-copy">
										<span className="hero-tag"><Sparkles size={15} /> THE NEXT FRONTIER IS A QUESTION</span>
										<h2>Connect the dots.<br /><span>Discover the gaps.</span></h2>
										<p>Turn scattered literature into an explorable map of ideas. Connect sources to limitations, challenge assumptions, and design what comes next.</p>
										<div className="hero-buttons"><button type="button" className="primary-button" onClick={() => navigate("gaps")}>Explore research gaps <ArrowRight size={17} /></button><button type="button" className="ghost-button" onClick={() => navigate("library")}>Browse library <ArrowUpRight size={16} /></button></div>
										<div className="hero-note"><span className="hero-note-dot" />Interactive graph · Evidence-linked nodes</div>
									</div>
									<ResearchGraph papers={papers} gaps={demoGaps} selectedId={inspection?.id ?? null} onSelectPaper={inspectPaper} onSelectGap={inspectGap} />
								</div>

								<div className="metric-grid">
									<div className="metric-card"><div className="metric-top"><span>Research papers</span><BookOpen size={19} /></div><strong>{papers.length.toString().padStart(2, "0")}</strong><p>In your current library</p><span className="metric-accent metric-accent--purple" /></div>
									<div className="metric-card"><div className="metric-top"><span>Candidate gaps</span><FolderSearch size={19} /></div><strong>{demoGaps.length.toString().padStart(2, "0")}</strong><p>Awaiting deeper validation</p><span className="metric-accent metric-accent--cyan" /></div>
									<div className="metric-card"><div className="metric-top"><span>Shortlisted ideas</span><Bookmark size={19} /></div><strong>{savedGapIds.length.toString().padStart(2, "0")}</strong><p>Saved for further review</p><span className="metric-accent metric-accent--peach" /></div>
									<div className="metric-card"><div className="metric-top"><span>Experiments</span><FlaskConical size={19} /></div><strong>{experiments.length.toString().padStart(2, "0")}</strong><p>Plans in your workspace</p><span className="metric-accent metric-accent--green" /></div>
								</div>

								<div className="dashboard-grid">
									<section className="surface-panel">
										<div className="panel-heading"><div><p className="panel-kicker">STAY CURIOUS</p><h2>Recent literature</h2></div><button type="button" className="text-action" onClick={() => navigate("library")}>View all <ArrowUpRight size={16} /></button></div>
										<div className="recent-paper-list">
											{filteredPapers.slice(0, 3).map((paper, index) => (
												<button type="button" className="recent-paper" key={paper.id} onClick={() => inspectPaper(paper.id)}>
													<span className="recent-paper-index">0{index + 1}</span><span className="recent-paper-body"><strong>{paper.title}</strong><small>{paper.venue} <span>·</span> {paper.year}</small></span><span className="recent-paper-arrow"><ArrowUpRight size={17} /></span>
												</button>
											))}
											{filteredPapers.length === 0 && <EmptySearch query={query} />}
										</div>
									</section>
									<section className="surface-panel">
										<div className="panel-heading"><div><p className="panel-kicker">POSSIBILITIES</p><h2>Research gap candidates</h2></div><button type="button" className="text-action" onClick={() => navigate("gaps")}>Explore all <ArrowUpRight size={16} /></button></div>
										<div className="compact-gap-list">{filteredGaps.slice(0, 2).map((gap) => <GapCard key={gap.id} gap={gap} compact saved={savedGapIds.includes(gap.id)} onOpen={inspectGap} onToggleSaved={toggleSavedGap} onCreateExperiment={startExperiment} />)}{filteredGaps.length === 0 && <EmptySearch query={query} />}</div>
									</section>
								</div>

								<div className="process-strip"><div className="process-intro"><span className="process-star"><ShieldCheck size={19} /></span><div><strong>Evidence, not assumptions.</strong><p>Re:Gap helps structure the process; it does not establish novelty for you.</p></div></div><div className="process-steps"><span>01 <b>Collect</b></span><ChevronRight size={15} /><span>02 <b>Connect</b></span><ChevronRight size={15} /><span>03 <b>Challenge</b></span><ChevronRight size={15} /><span>04 <b>Validate</b></span></div></div>
							</>
						)}

						{view === "library" && (
							<>
								<div className="collection-toolbar"><div><span className="collection-count">{filteredPapers.length} papers</span><span className="collection-subtitle">· {customPapers.length} added by you</span></div><label className="sort-field">Sort by <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label></div>
								<div className="library-grid">{filteredPapers.map((paper) => <PaperCard key={paper.id} paper={paper} selected={inspection?.kind === "paper" && inspection.id === paper.id && inspectorOpen} onOpen={inspectPaper} />)}</div>
								{filteredPapers.length === 0 && <EmptySearch query={query} />}
								<p className="collection-footnote"><CircleHelp size={15} /> Illustrative papers are clearly labeled. Only manually added entries represent information you supplied.</p>
							</>
						)}

						{view === "gaps" && (
							<>
								<div className="collection-toolbar"><div><span className="collection-count">{filteredGaps.length} candidates</span><span className="collection-subtitle">· {savedGapIds.length} shortlisted</span></div><span className="collection-caption"><ShieldCheck size={15} /> Novelty not yet established</span></div>
								<div className="gaps-grid">{filteredGaps.map((gap) => <GapCard key={gap.id} gap={gap} saved={savedGapIds.includes(gap.id)} onOpen={inspectGap} onToggleSaved={toggleSavedGap} onCreateExperiment={startExperiment} />)}</div>
								{filteredGaps.length === 0 && <EmptySearch query={query} />}
								<div className="guidance-panel"><div className="guidance-icon"><CircleHelp size={21} /></div><div><h3>What makes a gap worth investigating?</h3><p>A plausible gap is a starting hypothesis, not proof of originality. Compare against adjacent work, inspect primary sources, and specify a test that could disprove the idea.</p></div></div>
							</>
						)}

						{view === "experiments" && (
							<>
								<div className="collection-toolbar"><div><span className="collection-count">{filteredExperiments.length} experiment plans</span><span className="collection-subtitle">· saved locally in this browser</span></div><span className="collection-caption"><Target size={15} /> Hypothesis → Baseline → Metric</span></div>
								{experiments.length === 0 && !normalizedQuery ? (
									<div className="experiment-empty"><div className="experiment-empty-orbit"><FlaskConical size={40} /></div><span className="eyebrow">FROM POSSIBILITY TO PROOF</span><h2>Every discovery needs a test.</h2><p>Pick a candidate gap, define what you expect to happen, choose the baseline you will compare against, and decide how you will measure the result.</p><button type="button" className="primary-button" onClick={() => startExperiment()}>Create your first experiment <ArrowRight size={17} /></button></div>
								) : (
									<div className="experiments-list">{filteredExperiments.map((experiment) => (
										<article key={experiment.id} className="experiment-card">
											<div className="experiment-card-head"><span className="experiment-icon"><FlaskConical size={20} /></span><span className="experiment-date">{formatDate(experiment.createdAt)}</span><label className="experiment-status-label"><span className="sr-only">Status for {experiment.title}</span><select value={experiment.status} onChange={(event) => updateExperimentStatus(experiment.id, event.target.value as ExperimentStatus)}><option value="planned">Planned</option><option value="in-progress">In progress</option><option value="complete">Completed</option></select></label><button type="button" className="icon-button experiment-delete" aria-label={`Delete ${experiment.title}`} onClick={() => removeExperiment(experiment.id)}><Trash2 size={16} /></button></div>
											<h2>{experiment.title}</h2><button type="button" className="experiment-link" onClick={() => inspectGap(experiment.gapId)}>{demoGaps.find((gap) => gap.id === experiment.gapId)?.title ?? "Linked candidate gap"} <ArrowUpRight size={14} /></button>
											<div className="experiment-fields"><div><span>HYPOTHESIS</span><p>{experiment.hypothesis}</p></div><div><span>BASELINE</span><p>{experiment.baseline}</p></div><div><span>SUCCESS METRIC</span><p>{experiment.metric}</p></div></div>
										</article>
									))}</div>
								)}
								{experiments.length > 0 && filteredExperiments.length === 0 && <EmptySearch query={query} />}
							</>
						)}
					</main>
					<footer className="app-bottom"><span>© Re:Gap · Research with evidence</span><span>Local-first prototype <span className="footer-separator">·</span> <Check size={13} /> Your changes stay in this browser</span></footer>
				</div>

				{inspectorOpen && <button type="button" className="inspector-scrim" aria-label="Close source inspector" onClick={() => setInspectorOpen(false)} />}
				{inspectorOpen && (
					<aside className="regap-inspector" aria-label="Source inspector">
						<div className="inspector-heading"><div><span className="inspector-overline">RESEARCH CONTEXT</span><h2>Source inspector</h2></div><button type="button" className="icon-button" aria-label="Close source inspector" onClick={() => setInspectorOpen(false)}><X size={19} /></button></div>
						{selectedPaper && (
							<div className="inspector-inner">
								<div className="inspector-icon"><BookOpen size={23} /></div>
								<span className="inspector-type">PAPER · {selectedPaper.year}</span>
								<h3>{selectedPaper.title}</h3><p className="inspector-authors">{selectedPaper.authors}</p>
								<div className="inspector-divider" /><h4>Overview</h4><p>{selectedPaper.summary}</p>
								<div className="inspector-divider" /><h4>Potential limitation</h4><p>{selectedPaper.limitation}</p>
								<div className="inspector-divider" /><h4>Linked candidate gaps</h4>
								<div className="inspector-links">{demoGaps.filter((gap) => gap.sourceIds.includes(selectedPaper.id)).map((gap) => <button key={gap.id} type="button" onClick={() => inspectGap(gap.id)}>{gap.title} <ArrowUpRight size={14} /></button>)}{!demoGaps.some((gap) => gap.sourceIds.includes(selectedPaper.id)) && <p>No candidate gaps linked yet.</p>}</div>
								{selectedPaper.id.startsWith("manual-") ? <button type="button" className="danger-button" onClick={() => deletePaper(selectedPaper.id)}><Trash2 size={16} /> Remove from library</button> : <div className="inspector-disclaimer"><CircleHelp size={17} /><span>Illustrative record, not a real citation. Verify metadata and evidence before using it in research.</span></div>}
							</div>
						)}
						{selectedGap && (
							<div className="inspector-inner">
								<div className="inspector-icon inspector-icon--gap"><FolderSearch size={23} /></div><span className="inspector-type">CANDIDATE RESEARCH GAP</span><h3>{selectedGap.title}</h3><span className="status-pill"><span />{selectedGap.confidence}</span>
								<div className="inspector-divider" /><h4>Research question</h4><p>{selectedGap.description}</p>
								<div className="inspector-divider" /><h4>What to check next</h4><p>{selectedGap.nextStep}</p>
								<div className="inspector-divider" /><h4>Linked sources</h4><div className="inspector-links">{selectedGap.sourceIds.map((id) => { const paper = papers.find((item) => item.id === id); return paper ? <button key={id} type="button" onClick={() => inspectPaper(id)}>{paper.title}<ArrowUpRight size={14} /></button> : null; })}</div>
								<button type="button" className="primary-button inspector-primary" onClick={() => startExperiment(selectedGap.id)}>Plan an experiment <ArrowRight size={16} /></button>
								<button type="button" className="quiet-button inspector-secondary" onClick={() => toggleSavedGap(selectedGap.id)}>{savedGapIds.includes(selectedGap.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{savedGapIds.includes(selectedGap.id) ? "Remove from shortlist" : "Save to shortlist"}</button>
							</div>
						)}
						{!selectedPaper && !selectedGap && <div className="inspector-empty"><FileSearch size={30} /><p>Choose a paper or research gap to inspect its context.</p></div>}
					</aside>
				)}
			</div>

			{showAddPaper && (
				<div className="modal-backdrop">
					<button type="button" className="modal-dismiss" aria-label="Close add paper dialog backdrop" onClick={() => setShowAddPaper(false)} />
					<div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="add-paper-heading">
						<div className="modal-head"><div><span className="eyebrow">BUILD YOUR LIBRARY</span><h2 id="add-paper-heading">Add a research paper</h2></div><button type="button" className="icon-button" aria-label="Close add paper dialog" onClick={() => setShowAddPaper(false)}><X size={20} /></button></div>
						<p className="modal-intro">Save source details in this browser. Metadata is not fetched or verified automatically.</p>
						<form className="workspace-form" onSubmit={addPaper}>
							<label>Paper title <input ref={paperTitleRef} required maxLength={300} value={newPaperTitle} onChange={(event) => setNewPaperTitle(event.target.value)} placeholder="Enter the full title" /></label>
							<label>Authors <input value={newPaperAuthors} onChange={(event) => setNewPaperAuthors(event.target.value)} placeholder="Names as listed in the paper" /></label>
							<div className="form-columns"><label>Year <input type="number" min="1900" max="2100" required value={newPaperYear} onChange={(event) => setNewPaperYear(event.target.value)} /></label><label>Venue <input value={newPaperVenue} onChange={(event) => setNewPaperVenue(event.target.value)} placeholder="Conference / journal" /></label></div>
							<label>Abstract or notes <textarea rows={3} value={newPaperSummary} onChange={(event) => setNewPaperSummary(event.target.value)} placeholder="Summarize the contribution, or paste a verified abstract..." /></label>
							<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setShowAddPaper(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={17} /> Add to library</button></div>
						</form>
					</div>
				</div>
			)}
			{showExperimentForm && (
				<div className="modal-backdrop">
					<button type="button" className="modal-dismiss" aria-label="Close experiment dialog backdrop" onClick={() => setShowExperimentForm(false)} />
					<div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="experiment-heading">
						<div className="modal-head"><div><span className="eyebrow">MAKE IT TESTABLE</span><h2 id="experiment-heading">Plan an experiment</h2></div><button type="button" className="icon-button" aria-label="Close experiment dialog" onClick={() => setShowExperimentForm(false)}><X size={20} /></button></div>
						<p className="modal-intro">A concrete test makes a research hypothesis easier to challenge and refine.</p>
						<form className="workspace-form" onSubmit={addExperiment}>
							<label>Linked gap <select value={experimentGapId} required onChange={(event) => setExperimentGapId(event.target.value)}>{demoGaps.map((gap) => <option key={gap.id} value={gap.id}>{gap.title}</option>)}</select></label>
							<label>Experiment title <input ref={experimentTitleRef} required value={experimentTitle} onChange={(event) => setExperimentTitle(event.target.value)} placeholder="What are you testing?" /></label>
							<label>Hypothesis <textarea rows={2} required value={experimentHypothesis} onChange={(event) => setExperimentHypothesis(event.target.value)} placeholder="If we change X, then Y should improve because..." /></label>
							<label>Baseline <input required value={experimentBaseline} onChange={(event) => setExperimentBaseline(event.target.value)} placeholder="Existing method or control condition" /></label>
							<label>Evaluation metric <input required value={experimentMetric} onChange={(event) => setExperimentMetric(event.target.value)} placeholder="e.g. P95 latency at matched throughput" /></label>
							<div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setShowExperimentForm(false)}>Cancel</button><button type="submit" className="primary-button"><CheckCircle2 size={17} /> Save experiment plan</button></div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
