"use client";

import { useEffect, useState } from "react";

type Validator<T> = (input: unknown) => input is T;

export function usePersistentState<T>(
	key: string,
	initialValue: T,
	validate?: Validator<T>,
) {
	const [value, setValue] = useState<T>(initialValue);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		function decode(raw: string | null): T | null {
			if (raw === null) return null;
			try {
				const parsed: unknown = JSON.parse(raw);
				if (validate && !validate(parsed)) {
					console.warn(`Ignoring invalid saved data for "${key}".`);
					return null;
				}
				return parsed as T;
			} catch (error) {
				console.warn(`Ignoring unreadable saved data for "${key}":`, error);
				return null;
			}
		}

		try {
			const parsed = decode(window.localStorage.getItem(key));
			if (parsed !== null) setValue(parsed);
		} catch (error) {
			console.warn(`Could not read browser storage for "${key}":`, error);
		} finally {
			setReady(true);
		}

		function onStorage(event: StorageEvent) {
			if (event.storageArea !== window.localStorage || event.key !== key)
				return;
			const next = decode(event.newValue);
			if (next !== null) setValue(next);
		}
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [key, validate]);

	useEffect(() => {
		if (!ready) return;
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.warn(`Could not save browser storage for "${key}":`, error);
		}
	}, [key, value, ready]);

	return [value, setValue, ready] as const;
}
