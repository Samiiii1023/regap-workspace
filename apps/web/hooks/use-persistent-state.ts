"use client";

import { useEffect, useState } from "react";

export function usePersistentState<T>(key: string, initialValue: T) {
	const [value, setValue] = useState<T>(initialValue);
	const [ready, setReady] = useState(false);

	// Load previously saved state after mounting.
	useEffect(() => {
		try {
			const storedValue = window.localStorage.getItem(key);

			if (storedValue !== null) {
				setValue(JSON.parse(storedValue) as T);
			}
		} catch (error) {
			console.error(`Failed to load localStorage key "${key}":`, error);
		} finally {
			setReady(true);
		}
	}, [key]);

	// Save state whenever its value changes.
	useEffect(() => {
		if (!ready) return;

		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.error(`Failed to save localStorage key "${key}":`, error);
		}
	}, [key, value, ready]);

	return [value, setValue, ready] as const;
}
