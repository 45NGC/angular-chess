/**
 * Formats milliseconds to MM:SS (e.g., 125000 → "2:05")
 */
export function formatTime(ms: number): string {
	const clamped = Math.max(0, ms);
	const totalSeconds = Math.floor(clamped / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Returns the fraction of a second (tenths) only if time is < 15 seconds.
 * Returns null otherwise.
 */
export function formatTimeFraction(ms: number): string | null {
	const clamped = Math.max(0, ms);
	if (clamped >= 15_000) return null;
	const tenths = Math.floor((clamped % 1000) / 100);
	return tenths.toString();
}