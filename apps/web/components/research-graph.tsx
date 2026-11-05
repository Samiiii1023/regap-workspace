"use client";

import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Gap, Paper } from "@/lib/demo-data";

type GraphNode = {
	id: string;
	title: string;
	kind: "paper" | "gap";
	x: number;
	y: number;
	z: number;
};

type ProjectedNode = GraphNode & {
	screenX: number;
	screenY: number;
	depth: number;
	scale: number;
};

type ResearchGraphProps = {
	papers: Paper[];
	gaps: Gap[];
	selectedId: string | null;
	onSelectPaper: (id: string) => void;
	onSelectGap: (id: string) => void;
};

const anchors = [
	[-176, -84, 46],
	[165, -86, 78],
	[-125, 103, -44],
	[142, 116, -80],
	[-15, -144, -105],
	[22, 131, 102],
	[198, 14, -24],
	[-202, 8, -50],
] as const;

function project(
	node: GraphNode,
	pitch: number,
	yaw: number,
	zoom: number,
): ProjectedNode {
	const rx = (pitch * Math.PI) / 180;
	const ry = (yaw * Math.PI) / 180;
	const x1 = node.x * Math.cos(ry) + node.z * Math.sin(ry);
	const z1 = -node.x * Math.sin(ry) + node.z * Math.cos(ry);
	const y2 = node.y * Math.cos(rx) - z1 * Math.sin(rx);
	const z2 = node.y * Math.sin(rx) + z1 * Math.cos(rx);
	const perspective = 490 / (490 - z2);
	const scale = perspective * zoom;

	return {
		...node,
		screenX: 310 + x1 * scale,
		screenY: 200 + y2 * scale,
		depth: z2,
		scale,
	};
}

export function ResearchGraph({
	papers,
	gaps,
	selectedId,
	onSelectPaper,
	onSelectGap,
}: ResearchGraphProps) {
	const [pitch, setPitch] = useState(-17);
	const [yaw, setYaw] = useState(23);
	const [zoom, setZoom] = useState(0.94);
	const drag = useRef<{ x: number; y: number; pointerId: number } | null>(null);

	const nodes = useMemo<GraphNode[]>(() => {
		const visibleGaps = gaps.slice(0, 5);
		const linkedPaperIds = new Set(visibleGaps.flatMap((gap) => gap.sourceIds));
		const prioritizedPapers = [
			...papers.filter((paper) => linkedPaperIds.has(paper.id)),
			...papers.filter((paper) => !linkedPaperIds.has(paper.id)),
		].slice(0, 8);
		const paperNodes = prioritizedPapers.map((paper, index) => {
			const [x, y, z] = anchors[index % anchors.length] ?? anchors[0];
			return {
				id: paper.id,
				title: paper.title,
				kind: "paper" as const,
				x,
				y,
				z,
			};
		});

		const gapNodes = visibleGaps.map((gap, index) => {
			const angle =
				(index * Math.PI * 2) / Math.max(visibleGaps.length, 2) + 0.5;
			return {
				id: gap.id,
				title: gap.title,
				kind: "gap" as const,
				x: Math.cos(angle) * 88,
				y: Math.sin(angle) * 100,
				z: 85 - index * 26,
			};
		});

		return [...paperNodes, ...gapNodes];
	}, [papers, gaps]);

	const projected = useMemo(
		() => nodes.map((node) => project(node, pitch, yaw, zoom)),
		[nodes, pitch, yaw, zoom],
	);
	const points = new Map(projected.map((node) => [node.id, node]));
	const connections = gaps.flatMap((gap) =>
		gap.sourceIds.map((paperId) => ({
			id: `${gap.id}-${paperId}`,
			start: points.get(gap.id),
			end: points.get(paperId),
		})),
	);

	function reset() {
		setPitch(-17);
		setYaw(23);
		setZoom(0.94);
	}

	function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (event.button !== 0 || (event.target as HTMLElement).closest("button"))
			return;
		drag.current = {
			x: event.clientX,
			y: event.clientY,
			pointerId: event.pointerId,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
		if (!drag.current || drag.current.pointerId !== event.pointerId) return;
		const dx = event.clientX - drag.current.x;
		const dy = event.clientY - drag.current.y;
		drag.current = { ...drag.current, x: event.clientX, y: event.clientY };
		setYaw((previous) => previous + dx * 0.48);
		setPitch((previous) => Math.max(-70, Math.min(70, previous - dy * 0.42)));
	}

	function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
		if (drag.current?.pointerId === event.pointerId) {
			drag.current = null;
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}
		}
	}

	return (
		<div className="research-graph">
			<div className="graph-toolbar">
				<span className="graph-live-dot" />
				<span>Knowledge constellation</span>
				<span className="graph-toolbar-count">
					{nodes.length} of {papers.length + gaps.length} nodes
				</span>
			</div>

			<section
				className="graph-stage"
				aria-label="Interactive perspective research graph. Drag the background to rotate, or choose a node to inspect."
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={stopDragging}
				onPointerCancel={stopDragging}
			>
				<div className="graph-halo graph-halo-one" aria-hidden="true" />
				<div className="graph-halo graph-halo-two" aria-hidden="true" />
				<div className="graph-orbit graph-orbit-one" aria-hidden="true" />
				<div className="graph-orbit graph-orbit-two" aria-hidden="true" />
				<svg
					className="graph-edges"
					viewBox="0 0 620 400"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<defs>
						<linearGradient
							id="graph-edge-gradient"
							x1="0"
							y1="0"
							x2="1"
							y2="1"
						>
							<stop offset="0%" stopColor="#c9fb98" stopOpacity="0.5" />
							<stop offset="100%" stopColor="#77e0d7" stopOpacity="0.65" />
						</linearGradient>
					</defs>
					{connections.map((connection) =>
						connection.start && connection.end ? (
							<line
								key={connection.id}
								x1={connection.start.screenX}
								y1={connection.start.screenY}
								x2={connection.end.screenX}
								y2={connection.end.screenY}
								stroke="url(#graph-edge-gradient)"
								strokeWidth="1.5"
								strokeDasharray="4 5"
							/>
						) : null,
					)}
					<circle cx="310" cy="200" r="39" fill="#b6ed9b" fillOpacity="0.035" />
					<circle cx="310" cy="200" r="27" fill="#b6ed9b" fillOpacity="0.07" />
				</svg>
				<div className="graph-origin" aria-hidden="true">
					<div className="graph-origin-core">
						R<span>:</span>G
					</div>
				</div>
				{[...projected]
					.sort((a, b) => a.depth - b.depth)
					.map((node) => (
						<button
							key={node.id}
							type="button"
							title={node.title}
							aria-label={`Inspect ${node.kind}: ${node.title}`}
							aria-pressed={selectedId === node.id}
							onClick={() =>
								node.kind === "paper"
									? onSelectPaper(node.id)
									: onSelectGap(node.id)
							}
							className={`graph-node graph-node--${node.kind} ${selectedId === node.id ? "graph-node--selected" : ""}`}
							style={{
								left: `${(node.screenX / 620) * 100}%`,
								top: `${(node.screenY / 400) * 100}%`,
								transform: `translate(-50%, -50%) scale(${Math.max(0.65, Math.min(1.7, node.scale))})`,
								zIndex: Math.round(node.depth + 300),
								opacity: Math.max(0.58, Math.min(1, 0.85 + node.depth / 500)),
							}}
						>
							<span className="graph-node-ring">
								<span className="graph-node-center" />
							</span>
							<span className="graph-node-label">{node.title}</span>
						</button>
					))}
				<div className="graph-floor" aria-hidden="true" />
			</section>

			<div className="graph-bottom">
				<div className="graph-legend">
					<span>
						<i className="graph-legend-paper" /> Papers
					</span>
					<span>
						<i className="graph-legend-gap" /> Candidate gaps
					</span>
				</div>
				<fieldset
					className="graph-controls"
					aria-label="Graph controls; use arrow keys while focused on a control to rotate the graph"
					onKeyDown={(event) => {
						if (event.key === "ArrowLeft") {
							event.preventDefault();
							setYaw((previous) => previous - 15);
						} else if (event.key === "ArrowRight") {
							event.preventDefault();
							setYaw((previous) => previous + 15);
						} else if (event.key === "ArrowUp") {
							event.preventDefault();
							setPitch((previous) => Math.min(70, previous + 15));
						} else if (event.key === "ArrowDown") {
							event.preventDefault();
							setPitch((previous) => Math.max(-70, previous - 15));
						}
					}}
				>
					<button
						type="button"
						aria-label="Zoom out"
						onClick={() =>
							setZoom((previous) => Math.max(0.6, previous - 0.12))
						}
					>
						<Minus size={15} />
					</button>
					<button
						type="button"
						aria-label="Reset graph orientation"
						onClick={reset}
					>
						<RotateCcw size={14} />
					</button>
					<button
						type="button"
						aria-label="Zoom in"
						onClick={() =>
							setZoom((previous) => Math.min(1.5, previous + 0.12))
						}
					>
						<Plus size={15} />
					</button>
					<button
						type="button"
						aria-label="Fit graph"
						onClick={reset}
						className="graph-control-fit"
					>
						<Maximize2 size={14} />
					</button>
				</fieldset>
			</div>
			<p className="graph-hint">
				Drag to orbit · Arrow keys on controls rotate · Select a node to inspect
				evidence
			</p>
		</div>
	);
}
