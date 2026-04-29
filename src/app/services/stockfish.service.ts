type StockfishLine = string;

export class StockfishService {
	private worker: Worker | null = null;
	private listeners = new Set<(line: StockfishLine) => void>();
	private initPromise: Promise<void> | null = null;
	private queue: Promise<unknown> = Promise.resolve();
	private debug = typeof localStorage !== 'undefined' && localStorage.getItem('debugStockfish') === '1';

	private ensureWorker(): Worker {
		if (this.worker) return this.worker;

		// Use a relative URL so it also works when the app is deployed under a sub-path/base-href.
		// Stockfish.js detects worker environments automatically.
		this.worker = new Worker('assets/stockfish/stockfish.js');
		this.worker.onmessage = (event: MessageEvent) => {
			const line = String(event.data ?? '').trim();
			if (this.debug) console.log('[stockfish]', line);
			for (const fn of this.listeners) fn(line);
		};
		this.worker.onerror = (event) => {
			console.error('Stockfish worker error:', event);
		};
		this.worker.onmessageerror = (event) => {
			console.error('Stockfish worker messageerror:', event);
		};
		return this.worker;
	}

	private async init(): Promise<void> {
		if (this.initPromise) return this.initPromise;
		this.initPromise = (async () => {
			this.ensureWorker();
			// Cold start (WASM compile) can take several seconds in some environments.
			await this.sendAndWait('uci', (l) => l === 'uciok', 15000);
			await this.sendAndWait('isready', (l) => l === 'readyok', 15000);
		})();
		return this.initPromise;
	}

	async getBestMove(params: { fen: string; skillLevel: number; moveTimeMs: number }): Promise<string | null> {
		const { fen, skillLevel, moveTimeMs } = params;
		this.queue = this.queue.then(async () => {
			await this.init();
			this.post(`setoption name Skill Level value ${clampInt(skillLevel, 0, 20)}`);
			await this.sendAndWait('isready', (l) => l === 'readyok', 5000);

			this.post('ucinewgame');
			this.post(`position fen ${fen}`);

			const bestmove = await this.sendAndWait(
				`go movetime ${Math.max(100, Math.floor(moveTimeMs))}`,
				(l) => l.startsWith('bestmove '),
				Math.max(3000, moveTimeMs + 3000)
			);

			const parts = bestmove.split(/\s+/);
			const move = parts[1] ?? '';
			return move && move !== '(none)' ? move : null;
		});

		return this.queue as Promise<string | null>;
	}

	stop(): void {
		if (!this.worker) return;
		this.worker.postMessage('stop');
	}

	destroy(): void {
		this.listeners.clear();
		this.worker?.terminate();
		this.worker = null;
		this.initPromise = null;
		this.queue = Promise.resolve();
	}

	private post(cmd: string): void {
		this.ensureWorker().postMessage(cmd);
	}

	private sendAndWait(cmd: string, predicate: (line: string) => boolean, timeoutMs: number): Promise<string> {
		// Create the listener before posting, to avoid missing very fast responses.
		const wait = this.waitFor(predicate, timeoutMs);
		this.post(cmd);
		return wait;
	}

	private waitFor(predicate: (line: string) => boolean, timeoutMs: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const timer = window.setTimeout(() => {
				this.listeners.delete(onLine);
				reject(new Error(`Stockfish timeout after ${timeoutMs}ms`));
			}, timeoutMs);

			const onLine = (line: string) => {
				if (!predicate(line)) return;
				window.clearTimeout(timer);
				this.listeners.delete(onLine);
				resolve(line);
			};

			this.listeners.add(onLine);
		});
	}
}

function clampInt(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.max(min, Math.min(max, Math.floor(value)));
}
