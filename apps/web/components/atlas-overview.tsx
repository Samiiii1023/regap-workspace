"use client";

import { ArrowRight, BookOpen, Bookmark, FlaskConical, Network, Plus, Share2 } from "lucide-react";
import type { Gap, Paper } from "@/lib/demo-data";
import type { Experiment } from "@/lib/research-data";
import { ResearchGraph } from "./research-graph";

type Props = {
	papers: Paper[];
	gaps: Gap[];
	experiments: Experiment[];
	savedGapIds: string[];
	selectedId: string | null;
	onSelectPaper: (id: string) => void;
	onSelectGap: (id: string) => void;
	onSelectExperiment: (id: string) => void;
	onAddPaper: () => void;
	onViewGaps: () => void;
	onViewLibrary: () => void;
};

export function AtlasOverview({
	papers, gaps, experiments, savedGapIds, selectedId,
	onSelectPaper, onSelectGap, onSelectExperiment,
	onAddPaper, onViewGaps, onViewLibrary,
}: Props) {
	const sourceIds = new Set(gaps.flatMap((gap) => gap.sourceIds));
	const supported = papers.filter((paper) => sourceIds.has(paper.id)).length;
	const connected = gaps.reduce((sum, gap) => sum + gap.sourceIds.length, 0);
	const coverage = papers.length === 0 ? 0 : Math.round(supported / papers.length * 100);
	const active = experiments.filter((e) => e.status === "in-progress").length;
	const completed = experiments.filter((e) => e.status === "complete").length;
	const planned = experiments.filter((e) => e.status === "planned").length;
	const total = experiments.length;

	return (
		<div className="atlas-overview">
			<section className="atlas-workspace">
				<header className="atlas-workspace-heading">
					<div>
						<p className="atlas-kicker"><Network size={13} /> RESEARCH INTELLIGENCE / MAP</p>
						<h2>Explore your research space.</h2>
						<p>Trace evidence between papers, unresolved questions, and experiments. Every connection is yours to verify.</p>
					</div>
					<div className="atlas-workspace-stats" aria-label="Research records">
						<div><BookOpen size={17} /><strong>{papers.length}</strong><span>Papers</span></div>
						<div><Share2 size={17} /><strong>{gaps.length}</strong><span>Gaps</span></div>
						<div><FlaskConical size={17} /><strong>{experiments.length}</strong><span>Experiments</span></div>
					</div>
				</header>

				<ResearchGraph
					papers={papers}
					gaps={gaps}
					experiments={experiments}
					selectedId={selectedId}
					onSelectPaper={onSelectPaper}
					onSelectGap={onSelectGap}
					onSelectExperiment={onSelectExperiment}
				/>
				<footer className="atlas-context-bar">
					<span><i /> Illustrative records are labeled as demo data. Connections indicate saved evidence links, not proven novelty.</span>
					<button type="button" onClick={onViewLibrary}>Browse library <ArrowRight size={14} /></button>
				</footer>
			</section>

			<div className="atlas-insight-cards">
				<section className="atlas-insight-card">
					<div className="atlas-insight-title"><span>01 / EVIDENCE</span><BookOpen size={16} /></div>
					<h3>Source coverage</h3>
					<div className="atlas-coverage-number"><strong>{coverage}%</strong><span>{supported} of {papers.length} papers linked</span></div>
					<div className="atlas-coverage-track"><span style={{ width: String(coverage) + "%" }} /></div>
					<p>{connected} recorded paper–gap connections</p>
				</section>

				<section className="atlas-insight-card">
					<div className="atlas-insight-title"><span>02 / RESEARCH QUESTIONS</span><Share2 size={16} /></div>
					<h3>Evidence depth</h3>
					<div className="atlas-gap-heatmap" aria-label="Sources linked to research questions">
						{gaps.slice(0, 28).map((gap) => (
							<button
								type="button"
								key={gap.id}
								className={"atlas-heatmap-cell atlas-depth-" + Math.min(4, gap.sourceIds.length)}
								title={gap.title + " — " + gap.sourceIds.length + " linked papers"}
								aria-label={"Inspect gap: " + gap.title}
								onClick={() => onSelectGap(gap.id)}
							/>
						))}
						{gaps.length === 0 && <span className="atlas-no-data">No gap candidates yet</span>}
					</div>
					<p>{savedGapIds.length} shortlisted of {gaps.length} candidates</p>
				</section>

				<section className="atlas-insight-card">
					<div className="atlas-insight-title"><span>03 / VALIDATION</span><FlaskConical size={16} /></div>
					<h3>Experiment pipeline</h3>
					<div className="atlas-pipeline-numbers">
						<div><strong>{planned}</strong><span>Planned</span></div>
						<div><strong>{active}</strong><span>Running</span></div>
						<div><strong>{completed}</strong><span>Complete</span></div>
					</div>
					<div className="atlas-pipeline-track">
						{total > 0 && <span className="atlas-pipeline-planned" style={{ width: String(planned / total * 100) + "%" }} />}
						{total > 0 && <span className="atlas-pipeline-active" style={{ width: String(active / total * 100) + "%" }} />}
						{total > 0 && <span className="atlas-pipeline-done" style={{ width: String(completed / total * 100) + "%" }} />}
					</div>
					<p>{total === 0 ? "Ready for your first testable hypothesis" : total + " experiment plans saved locally"}</p>
				</section>
			</div>

			<div className="atlas-quick-links">
				<div><strong>Research is a process.</strong><span>Collect sources, identify limitations, test your assumptions.</span></div>
				<div className="atlas-quick-actions">
					<button type="button" onClick={onAddPaper}><Plus size={16} /> Add paper</button>
					<button type="button" onClick={onViewGaps}><Bookmark size={16} /> Explore gaps</button>
				</div>
			</div>
		</div>
	);
}
