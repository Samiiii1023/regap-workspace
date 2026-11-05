"use client";

import { CheckCircle2, FileText, Plus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useModalFocus } from "@/hooks/use-modal-focus";
import type { Gap, Paper } from "@/lib/demo-data";

type AddGapDialogProps = {
	papers: Paper[];
	onClose: () => void;
	onCreate: (gap: Gap) => void;
};

export function AddGapDialog({ papers, onClose, onCreate }: AddGapDialogProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [nextStep, setNextStep] = useState("");
	const [sourceIds, setSourceIds] = useState<string[]>([]);
	const [sourceError, setSourceError] = useState(false);
	const modalRef = useModalFocus<HTMLDivElement>(onClose);

	function toggleSource(id: string) {
		setSourceError(false);
		setSourceIds((previous) =>
			previous.includes(id)
				? previous.filter((sourceId) => sourceId !== id)
				: [...previous, id],
		);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (sourceIds.length === 0) {
			setSourceError(true);
			return;
		}
		if (!title.trim() || !description.trim() || !nextStep.trim()) return;

		onCreate({
			id: `gap-custom-${crypto.randomUUID()}`,
			title: title.trim(),
			description: description.trim(),
			nextStep: nextStep.trim(),
			confidence: "Needs validation",
			sourceIds,
		});
	}

	return (
		<div className="modal-backdrop">
			<button
				type="button"
				className="modal-dismiss"
				aria-label="Close research gap dialog backdrop"
				onClick={onClose}
			/>
			<div
				ref={modalRef}
				className="workspace-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="add-gap-heading"
				aria-describedby="add-gap-description"
			>
				<div className="modal-head">
					<div>
						<span className="eyebrow">FROM LITERATURE TO DISCOVERY</span>
						<h2 id="add-gap-heading">New research gap</h2>
					</div>
					<button
						type="button"
						className="icon-button"
						aria-label="Close research gap dialog"
						onClick={onClose}
					>
						<X size={20} />
					</button>
				</div>
				<p className="modal-intro" id="add-gap-description">
					Capture a question grounded in literature. A candidate is not proof of
					novelty; validate it against prior work before making claims.
				</p>
				<form className="workspace-form" onSubmit={submit}>
					<label>
						Research question / gap title
						<input
							required
							maxLength={200}
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="e.g. Batching under dynamic GPU memory pressure"
						/>
					</label>
					<label>
						Why might this be unanswered?
						<textarea
							rows={3}
							required
							maxLength={1500}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Describe the limitation or open question in your own words..."
						/>
					</label>
					<label>
						What would you check next?
						<textarea
							rows={2}
							required
							maxLength={1000}
							value={nextStep}
							onChange={(event) => setNextStep(event.target.value)}
							placeholder="Find contradicting literature, compare baselines, and verify the gap."
						/>
					</label>
					<fieldset className="gap-source-fieldset">
						<legend>Connect supporting papers</legend>
						<p className="gap-source-intro">
							Select at least one paper. Illustrative examples are not verified
							sources.
						</p>
						<div className="gap-source-picker">
							{papers.map((paper) => (
								<label className="gap-source-choice" key={paper.id}>
									<input
										type="checkbox"
										checked={sourceIds.includes(paper.id)}
										onChange={() => toggleSource(paper.id)}
									/>
									<FileText size={17} aria-hidden="true" />
									<span>
										<strong>{paper.title}</strong>
										<small>
											{paper.year} ·{" "}
											{paper.id.startsWith("manual-")
												? "Your source"
												: "Illustrative example"}
										</small>
									</span>
								</label>
							))}
						</div>
						{sourceError && (
							<p className="gap-source-error" role="alert">
								Choose at least one linked paper.
							</p>
						)}
						<p className="gap-source-count">
							<CheckCircle2 size={14} aria-hidden="true" />
							{sourceIds.length} linked{" "}
							{sourceIds.length === 1 ? "paper" : "papers"}
						</p>
					</fieldset>
					<div className="modal-actions">
						<button type="button" className="ghost-button" onClick={onClose}>
							Cancel
						</button>
						<button type="submit" className="primary-button">
							<Plus size={17} />
							Create candidate gap
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
