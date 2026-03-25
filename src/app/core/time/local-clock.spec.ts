import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalClock } from './local-clock';

describe('LocalClock', () => {
	let originalPerformance: unknown;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));

		// Force LocalClock to use Date.now() (deterministic with fake timers).
		originalPerformance = (globalThis as any).performance;
		(globalThis as any).performance = undefined;
	});

	afterEach(() => {
		vi.useRealTimers();
		(globalThis as any).performance = originalPerformance;
	});

	it('initializes disabled until configured', () => {
		const clock = new LocalClock(() => {});
		expect(clock.getClockState()).toEqual({
			enabled: false,
			active: null,
			whiteMs: 0,
			blackMs: 0,
			whiteEnabled: false,
			blackEnabled: false,
			whiteBaseMs: 0,
			blackBaseMs: 0,
			whiteIncrementMs: 0,
			blackIncrementMs: 0
		});
	});

	it('configures base and increment times', () => {
		const clock = new LocalClock(() => {});
		clock.configure(1, 2, 3, 4);

		expect(clock.getClockState()).toEqual({
			enabled: true,
			active: null,
			whiteMs: 60_000,
			blackMs: 180_000,
			whiteEnabled: true,
			blackEnabled: true,
			whiteBaseMs: 60_000,
			blackBaseMs: 180_000,
			whiteIncrementMs: 2_000,
			blackIncrementMs: 4_000
		});
	});

	it('counts down the active side when started', () => {
		const clock = new LocalClock(() => {});
		clock.configure(1, 0, 0, 0);

		clock.start('white');
		vi.advanceTimersByTime(500);

		expect(clock.getClockState().active).toBe('white');
		expect(clock.getClockState().whiteMs).toBe(60_000 - 500);
		expect(clock.getClockState().blackMs).toBe(0);
	});

	it('switchTurn flushes elapsed time and applies increment to the mover', () => {
		const clock = new LocalClock(() => {});
		clock.configure(1, 2, 1, 0);

		clock.start('white');
		vi.advanceTimersByTime(1_000);
		clock.switchTurn('white');

		expect(clock.getClockState().active).toBe('black');
		expect(clock.getClockState().whiteMs).toBe(60_000 - 1_000 + 2_000);

		vi.advanceTimersByTime(500);
		expect(clock.getClockState().blackMs).toBe(60_000 - 500);
	});

	it('stop freezes the clock', () => {
		const clock = new LocalClock(() => {});
		clock.configure(1, 0, 0, 0);

		clock.start('white');
		vi.advanceTimersByTime(1_000);
		clock.stop();

		const stoppedAt = clock.getClockState().whiteMs;
		vi.advanceTimersByTime(5_000);
		expect(clock.getClockState().whiteMs).toBe(stoppedAt);
		expect(clock.getClockState().active).toBeNull();
	});

	it('fires onTimeout when time runs out', () => {
		const onTimeout = vi.fn();
		const clock = new LocalClock(onTimeout);
		clock.configure(1, 0, 0, 0);

		clock.start('white');
		vi.advanceTimersByTime(60_100);

		expect(onTimeout).toHaveBeenCalledTimes(1);
		expect(onTimeout).toHaveBeenCalledWith('black');
		expect(clock.getClockState().active).toBeNull();
		expect(clock.getClockState().whiteMs).toBe(0);
	});
});

