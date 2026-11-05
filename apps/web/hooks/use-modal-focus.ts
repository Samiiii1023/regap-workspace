"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keep keyboard focus inside an open dialog and restore it when the dialog closes.
 * Uses native focusable controls, without a new runtime dependency.
 */
export function useModalFocus<T extends HTMLElement>(
	onClose: () => void,
	enabled = true,
) {
	const dialogRef = useRef<T>(null);
	const closeRef = useRef(onClose);

	useEffect(() => {
		closeRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		if (!enabled) return;
		const dialog = dialogRef.current;
		if (!dialog) return;

		const previousFocus =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		const oldOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		function focusableElements() {
			return Array.from(
				dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
			).filter((element) => element.getClientRects().length > 0);
		}

		const firstInput = dialog.querySelector<HTMLElement>(
			'input:not([type="hidden"]),textarea,select',
		);
		(firstInput ?? focusableElements()[0] ?? dialog).focus();

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closeRef.current();
				return;
			}
			if (event.key !== "Tab") return;

			const elements = focusableElements();
			const first = elements[0];
			const last = elements[elements.length - 1];
			if (!first || !last) {
				event.preventDefault();
				dialog?.focus();
				return;
			}

			const active = document.activeElement;
			if (!dialog?.contains(active)) {
				event.preventDefault();
				(event.shiftKey ? last : first).focus();
			} else if (event.shiftKey && active === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener("keydown", onKeyDown, true);
		return () => {
			document.removeEventListener("keydown", onKeyDown, true);
			document.body.style.overflow = oldOverflow;
			if (previousFocus?.isConnected) previousFocus.focus();
		};
	}, [enabled]);

	return dialogRef;
}
