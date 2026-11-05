"use client";

import {
	ArrowUpRight,
	Box,
	Check,
	CircleHelp,
	Focus,
	Layers3,
	List,
	Maximize2,
	Minus,
	MousePointer2,
	Plus,
	RotateCcw,
	Share2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Gap, Paper } from "@/lib/demo-data";
import type { Experiment } from "@/lib/research-data";

type Kind = "paper" | "gap" | "experiment";
type View = "map" | "connections" | "list";
type Node = {
	id: string;
	title: string;
	kind: Kind;
	x: number;
	y: number;
	z: number;
};
type Link = { from: string; to: string };
type Position = Node & { sx: number; sy: number; depth: number; scale: number };

type Props = {
	papers: Paper[];
	gaps: Gap[];
	experiments?: Experiment[];
	selectedId: string | null;
	onSelectPaper: (id: string) => void;
	onSelectGap: (id: string) => void;
	onSelectExperiment?: (id: string) => void;
};

const COLORS: Record<Kind, [number, number, number]> = {
	paper: [0.23, 0.53, 0.45],
	gap: [0.43, 0.43, 0.74],
	experiment: [0.72, 0.48, 0.28],
};

function hash(value: string) {
	let h = 2166136261;
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function place(id: string, index: number, total: number, radius: number) {
	const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
	const jitter = (hash(id) % 60) - 30;
	return {
		x: Math.cos(angle) * (radius + jitter),
		y: Math.sin(angle) * (radius * 0.64 + jitter * 0.3),
		z: (hash(id + "z") % 160) - 80,
	};
}

function project(node: Node, pitch: number, yaw: number, zoom: number, spatial: boolean): Position {
	const p = (pitch * Math.PI) / 180;
	const y = (yaw * Math.PI) / 180;
	const rx = spatial ? node.x * Math.cos(y) + node.z * Math.sin(y) : node.x;
	const rz = spatial ? -node.x * Math.sin(y) + node.z * Math.cos(y) : 0;
	const ry = spatial ? node.y * Math.cos(p) - rz * Math.sin(p) : node.y;
	const depth = spatial ? node.y * Math.sin(p) + rz * Math.cos(p) : 0;
	const scale = (spatial ? 660 / (660 - depth) : 1) * zoom;
	return {
		...node,
		sx: 500 + rx * scale,
		sy: 300 + ry * scale,
		depth,
		scale,
	};
}

function makeShader(gl: WebGLRenderingContext, kind: number, source: string) {
	const shader = gl.createShader(kind);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

export function ResearchGraph({
	papers,
	gaps,
	experiments = [],
	selectedId,
	onSelectPaper,
	onSelectGap,
	onSelectExperiment,
}: Props) {
	const [view, setView] = useState<View>("map");
	const [spatial, setSpatial] = useState(true);
	const [pitch, setPitch] = useState(-11);
	const [yaw, setYaw] = useState(12);
	const [zoom, setZoom] = useState(1);
	const [layers, setLayers] = useState<Record<Kind, boolean>>({
		paper: true,
		gap: true,
		experiment: true,
	});
	const [gpuReady, setGpuReady] = useState(false);
	const [fullscreen, setFullscreen] = useState(false);
	const stage = useRef<HTMLDivElement>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const drag = useRef<{ id: number; x: number; y: number } | null>(null);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReducedMotion(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	const scene = useMemo(() => {
		// Prioritize evidence-linked papers so the displayed edges are meaningful.
		const relevantIds = new Set(gaps.flatMap((g) => g.sourceIds));
		const visibleGaps = gaps.slice(0, 16);
		const orderedPapers = [
			...papers.filter((p) => relevantIds.has(p.id)),
			...papers.filter((p) => !relevantIds.has(p.id)),
		].slice(0, 28);
		const visibleExperiments = experiments
			.filter((e) => visibleGaps.some((g) => g.id === e.gapId))
			.slice(0, 12);
		const nodes: Node[] = [
			...orderedPapers.map((p, i) => ({
				id: p.id, title: p.title, kind: "paper" as const,
				...place(p.id, i, orderedPapers.length, 330),
			})),
			...visibleGaps.map((g, i) => ({
				id: g.id, title: g.title, kind: "gap" as const,
				...place(g.id, i, visibleGaps.length, 175),
			})),
			...visibleExperiments.map((e, i) => ({
				id: e.id, title: e.title, kind: "experiment" as const,
				...place(e.id, i, visibleExperiments.length, 95),
			})),
		];
		const ids = new Set(nodes.map((node) => node.id));
		const links: Link[] = [
			...visibleGaps.flatMap((g) =>
				g.sourceIds.filter((id) => ids.has(id)).map((id) => ({
					from: g.id, to: id,
				})),
			),
			...visibleExperiments.map((e) => ({ from: e.id, to: e.gapId })),
		];
		return { nodes, links };
	}, [papers, gaps, experiments]);

	const nodes = useMemo(() =>
		scene.nodes.filter((node) => layers[node.kind]),
		[scene.nodes, layers],
	);
	const visibleIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
	const links = useMemo(() => scene.links.filter(
		(link) => visibleIds.has(link.from) && visibleIds.has(link.to),
	), [scene.links, visibleIds]);
	const positions = useMemo(
		() => nodes.map((node) => project(node, pitch, yaw, zoom, spatial)),
		[nodes, pitch, yaw, zoom, spatial],
	);
	const byId = useMemo(
		() => new Map(positions.map((pos) => [pos.id, pos])),
		[positions],
	);
	const graphLabels = {
		paper: "Papers",
		gap: "Research gaps",
		experiment: "Experiments",
	};

	// Native WebGL renderer: the scene really has 3D positions, yaw, pitch,
	// perspective and depth. No third-party 3D dependency or CDN is required.
	useEffect(() => {
		const element = canvas.current;
		if (!element || view !== "map") return;
		const gl = element.getContext("webgl", { alpha: true, antialias: true });
		if (!gl) {
			setGpuReady(false);
			return;
		}
		const vertex = makeShader(gl, gl.VERTEX_SHADER, [
			"attribute vec3 aPosition;",
			"attribute vec3 aColor;",
			"uniform float uYaw;",
			"uniform float uPitch;",
			"uniform float uZoom;",
			"uniform float uSpatial;",
			"varying vec3 vColor;",
			"void main() {",
			"  float cy = cos(uYaw), sy = sin(uYaw);",
			"  float cp = cos(uPitch), sp = sin(uPitch);",
			"  vec3 q = vec3(aPosition.x*cy+aPosition.z*sy, aPosition.y, -aPosition.x*sy+aPosition.z*cy);",
			"  vec3 r = vec3(q.x, q.y*cp-q.z*sp, q.y*sp+q.z*cp);",
			"  r = mix(vec3(aPosition.xy, 0.0), r, uSpatial);",
			"  float k = (uSpatial > 0.5 ? 660.0/(660.0-r.z) : 1.0)*uZoom;",
			"  gl_Position = vec4(r.x*k/500.0, -r.y*k/300.0, -r.z/700.0, 1.0);",
			"  gl_PointSize = max(2.0, min(12.0, 5.0*k));",
			"  vColor = aColor;",
			"}",
		].join("\n"));
		const fragment = makeShader(gl, gl.FRAGMENT_SHADER, [
			"precision mediump float;",
			"uniform float uDots;",
			"varying vec3 vColor;",
			"void main() {",
			"  if (uDots > 0.5) {",
			"    float d = length(gl_PointCoord-vec2(0.5));",
			"    if (d > 0.5) discard;",
			"    gl_FragColor = vec4(vColor, 1.0-smoothstep(0.3,0.5,d));",
			"  } else gl_FragColor = vec4(vColor, 0.32);",
			"}",
		].join("\n"));
		if (!vertex || !fragment) {
			setGpuReady(false);
			return;
		}
		const program = gl.createProgram();
		if (!program) return;
		gl.attachShader(program, vertex);
		gl.attachShader(program, fragment);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			setGpuReady(false);
			gl.deleteProgram(program);
			return;
		}
		const data: number[] = [];
		const dotData: number[] = [];
		const nodeMap = new Map(nodes.map((node) => [node.id, node]));
		for (const node of nodes) {
			const c = COLORS[node.kind];
			dotData.push(node.x, node.y, node.z, ...c);
		}
		for (const link of links) {
			const a = nodeMap.get(link.from);
			const b = nodeMap.get(link.to);
			if (!a || !b) continue;
			for (const node of [a, b]) {
				const c = COLORS[node.kind];
				data.push(node.x, node.y, node.z, ...c);
			}
		}
		const buffer = gl.createBuffer();
		if (!buffer) return;
		gl.useProgram(program);
		const position = gl.getAttribLocation(program, "aPosition");
		const color = gl.getAttribLocation(program, "aColor");
		const setCamera = (name: string, value: number) =>
			gl.uniform1f(gl.getUniformLocation(program, name), value);
		setCamera("uYaw", yaw * Math.PI / 180);
		setCamera("uPitch", pitch * Math.PI / 180);
		setCamera("uZoom", zoom);
		setCamera("uSpatial", spatial ? 1 : 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.DEPTH_TEST);

		function draw() {
			if (!gl || !element || !buffer || !program) return;
			const rect = element.getBoundingClientRect();
			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			element.width = Math.max(1, Math.round(rect.width * ratio));
			element.height = Math.max(1, Math.round(rect.height * ratio));
			gl.viewport(0, 0, element.width, element.height);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.enableVertexAttribArray(position);
			gl.enableVertexAttribArray(color);
			gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
			gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 24, 12);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
			setCamera("uDots", 0);
			gl.drawArrays(gl.LINES, 0, data.length / 6);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dotData), gl.STATIC_DRAW);
			setCamera("uDots", 1);
			gl.drawArrays(gl.POINTS, 0, dotData.length / 6);
		}
		draw();
		const observer = new ResizeObserver(draw);
		observer.observe(element);
		setGpuReady(true);
		return () => {
			observer.disconnect();
			gl.deleteBuffer(buffer);
			gl.deleteShader(vertex);
			gl.deleteShader(fragment);
			gl.deleteProgram(program);
		};
	}, [nodes, links, yaw, pitch, zoom, spatial, view]);

	function reset() {
		setPitch(-11);
		setYaw(12);
		setZoom(1);
	}

	function pick(node: Node) {
		if (node.kind === "paper") onSelectPaper(node.id);
		else if (node.kind === "gap") onSelectGap(node.id);
		else onSelectExperiment?.(node.id);
	}

	function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
		if (!spatial || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
		drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
		if (!drag.current || drag.current.id !== e.pointerId) return;
		const dx = e.clientX - drag.current.x;
		const dy = e.clientY - drag.current.y;
		drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
		setYaw((v) => v + dx * 0.44);
		setPitch((v) => Math.max(-65, Math.min(65, v - dy * 0.38)));
	}

	function pointerEnd(e: React.PointerEvent<HTMLDivElement>) {
		if (drag.current?.id !== e.pointerId) return;
		drag.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId))
			e.currentTarget.releasePointerCapture(e.pointerId);
	}

	async function toggleFullscreen() {
		const element = stage.current;
		if (!element) return;
		if (document.fullscreenElement === element) await document.exitFullscreen();
		else if (element.requestFullscreen) await element.requestFullscreen();
	}

	useEffect(() => {
		const update = () => setFullscreen(document.fullscreenElement === stage.current);
		document.addEventListener("fullscreenchange", update);
		return () => document.removeEventListener("fullscreenchange", update);
	}, []);

	return (
		<section className="research-graph atlas-graph" aria-label="Research knowledge graph">
			<div className="atlas-toolbar">
				<fieldset className="atlas-view-tabs" aria-label="Research map view">
					<button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>
						<Share2 size={15} /> Map
					</button>
					<button type="button" aria-pressed={view === "connections"} onClick={() => setView("connections")}>
						<Layers3 size={15} /> Connections
					</button>
					<button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
						<List size={15} /> List
					</button>
				</fieldset>
				<fieldset className="atlas-view-tabs atlas-dimensional" aria-label="Map dimensions">
					<button type="button" aria-pressed={!spatial} onClick={() => setSpatial(false)}>2D</button>
					<button type="button" aria-pressed={spatial} onClick={() => setSpatial(true)}>3D</button>
				</fieldset>
			</div>

			{view === "map" ? (
				<section
					ref={stage}
					className="graph-stage atlas-stage"
					aria-label="Interactive spatial research map; drag empty space to orbit, use controls to zoom, or select a paper, gap, or experiment"
					onPointerDown={pointerDown}
					onPointerMove={pointerMove}
					onPointerUp={pointerEnd}
					onPointerCancel={pointerEnd}
					onWheel={(e) => {
						if (e.ctrlKey) return;
						setZoom((v) => Math.max(0.65, Math.min(1.55, v - Math.sign(e.deltaY) * 0.045)));
					}}
				>
					<div className="atlas-rings" aria-hidden="true" />
					<canvas ref={canvas} className="atlas-webgl" aria-hidden="true" />
					{!gpuReady && (
						<svg className="atlas-fallback-edges" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
							{links.map((link) => {
								const a = byId.get(link.from);
								const b = byId.get(link.to);
								return a && b ? (
									<line key={link.from + ":" + link.to} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />
								) : null;
							})}
						</svg>
					)}
					<div className="atlas-origin" aria-hidden="true">
						<div className="atlas-origin-inner">
							<div className="atlas-emblem">
								<span className="atlas-emblem-cut" />
							</div>
							<strong>Re:Gap</strong>
							<small>THE RESEARCH SPACE</small>
						</div>
					</div>
					{positions.map((node) => (
						<button
							key={node.id}
							type="button"
							className={"graph-node atlas-node atlas-node--" + node.kind +
								(selectedId === node.id ? " atlas-node--active" : "")}
							title={node.title}
							aria-label={"Inspect " + node.kind + ": " + node.title}
							aria-pressed={selectedId === node.id}
							onClick={() => pick(node)}
							style={{
								left: String(node.sx / 10) + "%",
								top: String(node.sy / 6) + "%",
								zIndex: Math.round(60 + node.depth),
								transform: "translate(-50%, -50%) scale(" +
									String(Math.max(0.78, Math.min(1.24, node.scale))) + ")",
							}}
						>
							<span className="atlas-node-dot" />
							<span className="atlas-node-title">{node.title}</span>
						</button>
					))}
					<div className="atlas-stage-note">
						<MousePointer2 size={14} /> {spatial ? "Drag to orbit" : "Flat map"} · Select to inspect
					</div>
					<fieldset
						className="atlas-float-controls"
						aria-label="Graph camera controls"
						onKeyDown={(e) => {
							if (!spatial) return;
							if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
								e.preventDefault();
								if (e.key === "ArrowLeft") setYaw((v) => v - 15);
								if (e.key === "ArrowRight") setYaw((v) => v + 15);
								if (e.key === "ArrowUp") setPitch((v) => Math.max(-65, v - 12));
								if (e.key === "ArrowDown") setPitch((v) => Math.min(65, v + 12));
							}
						}}
					>
						<button type="button" aria-label="Zoom in" onClick={() => setZoom((v) => Math.min(1.55, v + 0.12))}><Plus size={17} /></button>
						<button type="button" aria-label="Zoom out" onClick={() => setZoom((v) => Math.max(0.65, v - 0.12))}><Minus size={17} /></button>
						<button type="button" aria-label="Reset graph orientation" onClick={reset}><RotateCcw size={16} /></button>
						<button type="button" aria-label={fullscreen ? "Exit fullscreen map" : "Fullscreen map"} onClick={toggleFullscreen}><Maximize2 size={16} /></button>
					</fieldset>
				</section>
			) : (
				<div className="atlas-data-panel">
					<div className="atlas-data-heading">
						<div className="atlas-data-icon">{view === "connections" ? <Share2 size={19} /> : <List size={19} />}</div>
						<div>
							<h3>{view === "connections" ? "Evidence relationships" : "Research records"}</h3>
							<p>{view === "connections" ? "Only explicitly recorded links are shown." : "Every node opens its related research context."}</p>
						</div>
					</div>
					<div className="atlas-data-list">
						{view === "connections" ? links.map((link) => {
							const source = scene.nodes.find((n) => n.id === link.from);
							const target = scene.nodes.find((n) => n.id === link.to);
							return source && target ? (
								<button type="button" key={link.from + ":" + link.to} onClick={() => pick(source)}>
									<Share2 size={16} />
									<span><strong>{source.title}</strong><small>Connected to {target.title}</small></span>
									<ArrowUpRight size={15} />
								</button>
							) : null;
						}) : nodes.map((node) => (
							<button type="button" key={node.id} onClick={() => pick(node)}>
								<span className={"atlas-kind-dot atlas-kind-dot--" + node.kind} />
								<span><strong>{node.title}</strong><small>{node.kind === "gap" ? "Research question" : node.kind === "paper" ? "Literature" : "Experiment plan"}</small></span>
								<ArrowUpRight size={15} />
							</button>
						))}
						{(view === "connections" ? links.length : nodes.length) === 0 && (
							<div className="atlas-empty"><CircleHelp size={20} /> No records in this view. Enable a layer or connect a research gap to its sources.</div>
						)}
					</div>
				</div>
			)}
			<div className="atlas-footer">
				<fieldset className="atlas-layer-controls" aria-label="Visible graph layers">
					{(["paper", "gap", "experiment"] as const).map((kind) => (
						<label key={kind} className={"atlas-layer atlas-layer--" + kind}>
							<input
								type="checkbox"
								checked={layers[kind]}
								onChange={(e) => setLayers((v) => ({ ...v, [kind]: e.target.checked }))}
							/>
							<span className="atlas-layer-check">{layers[kind] ? <Check size={11} /> : null}</span>
							{graphLabels[kind]}
						</label>
					))}
				</fieldset>
				<span className="atlas-node-count">
					<Focus size={14} /> {nodes.length} shown · {links.length} recorded links
				</span>
				{reducedMotion && <span className="atlas-reduced-motion">Reduced motion</span>}
				<button className="atlas-fit" type="button" onClick={reset} title="Reset camera"><Box size={15} /> Reset view</button>
			</div>
		</section>
	);
}
