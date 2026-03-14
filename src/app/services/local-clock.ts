export type ClockColor = 'white' | 'black';

export interface LocalClockState {
	enabled: boolean;
	active: ClockColor | null;
	whiteMs: number;
	blackMs: number;
	whiteEnabled: boolean;
	blackEnabled: boolean;
	whiteBaseMs: number;
	blackBaseMs: number;
	whiteIncrementMs: number;
	blackIncrementMs: number;
}

const nowMs = (): number => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const perf = (globalThis as any).performance;
	if (perf && typeof perf.now === 'function') return perf.now();
	return Date.now();
};

export class LocalClock {
	private intervalId: number | null = null;
	private lastTickAt = 0;

	private whiteBaseMs = 0;
	private blackBaseMs = 0;
	private whiteIncrementMs = 0;
	private blackIncrementMs = 0;

	private active: ClockColor | null = null;
	private whiteMs = 0;
	private blackMs = 0;

	constructor(
		private onTimeout: (winner: ClockColor) => void,
		private onUpdate?: (snapshot: LocalClockState) => void
	) { }

	configure(
		whiteBaseMinutes: number,
		whiteIncrementSeconds: number,
		blackBaseMinutes: number,
		blackIncrementSeconds: number
	): void {
		this.whiteBaseMs = Math.max(0, Math.floor(whiteBaseMinutes)) * 60_000;
		this.blackBaseMs = Math.max(0, Math.floor(blackBaseMinutes)) * 60_000;
		this.whiteIncrementMs = Math.max(0, Math.floor(whiteIncrementSeconds)) * 1000;
		this.blackIncrementMs = Math.max(0, Math.floor(blackIncrementSeconds)) * 1000;

		this.whiteMs = this.whiteBaseMs;
		this.blackMs = this.blackBaseMs;
		this.active = null;
		this.lastTickAt = 0;
		this.onUpdate?.(this.getSnapshot());
	}

	start(color: ClockColor): void {
		if (!this.isEnabled()) return;
		this.active = color;
		this.lastTickAt = nowMs();
		this.ensureInterval();
		this.onUpdate?.(this.getSnapshot());
	}

	stop(): void {
		this.flushElapsed();
		this.active = null;
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.onUpdate?.(this.getSnapshot());
	}

	switchTurn(mover: ClockColor): void {
		if (!this.isEnabled()) return;
		this.flushElapsed();
		this.addIncrement(mover);
		this.active = mover === 'white' ? 'black' : 'white';
		this.lastTickAt = nowMs();
		this.onUpdate?.(this.getSnapshot());
	}

	getSnapshot(): LocalClockState {
		return {
			enabled: this.isEnabled(),
			active: this.active,
			whiteMs: this.whiteMs,
			blackMs: this.blackMs,
			whiteEnabled: this.whiteBaseMs > 0,
			blackEnabled: this.blackBaseMs > 0,
			whiteBaseMs: this.whiteBaseMs,
			blackBaseMs: this.blackBaseMs,
			whiteIncrementMs: this.whiteIncrementMs,
			blackIncrementMs: this.blackIncrementMs
		};
	}

	private isEnabled(): boolean {
		return this.whiteBaseMs > 0 || this.blackBaseMs > 0;
	}

	private ensureInterval(): void {
		if (this.intervalId !== null) return;
		this.intervalId = window.setInterval(() => this.tick(), 100);
	}

	private tick(): void {
		if (!this.active) return;
		this.flushElapsed();
		this.onUpdate?.(this.getSnapshot());
		if (this.getRemaining(this.active) > 0) return;
		const winner: ClockColor = this.active === 'white' ? 'black' : 'white';
		this.stop();
		this.onTimeout(winner);
	}

	private flushElapsed(): void {
		if (!this.active) return;
		if (!this.lastTickAt) {
			this.lastTickAt = nowMs();
			return;
		}
		const current = nowMs();
		const elapsed = Math.max(0, current - this.lastTickAt);
		this.lastTickAt = current;
		this.subtract(this.active, elapsed);
	}

	private addIncrement(color: ClockColor): void {
		if (color === 'white') {
			if (this.whiteBaseMs <= 0 || this.whiteIncrementMs <= 0) return;
			this.whiteMs += this.whiteIncrementMs;
			return;
		}
		if (this.blackBaseMs <= 0 || this.blackIncrementMs <= 0) return;
		this.blackMs += this.blackIncrementMs;
	}

	private subtract(color: ClockColor, ms: number): void {
		if (color === 'white') {
			if (this.whiteBaseMs <= 0) return;
			this.whiteMs = Math.max(0, this.whiteMs - ms);
			return;
		}
		if (this.blackBaseMs <= 0) return;
		this.blackMs = Math.max(0, this.blackMs - ms);
	}

	private getRemaining(color: ClockColor): number {
		if (color === 'white') return this.whiteBaseMs <= 0 ? Number.POSITIVE_INFINITY : this.whiteMs;
		return this.blackBaseMs <= 0 ? Number.POSITIVE_INFINITY : this.blackMs;
	}
}
