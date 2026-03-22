import { describe, it, expect } from 'vitest';
import { Move } from './move';

describe('Move interface', () => {

	it('should allow a normal move without promotion', () => {
		const from = 10;
		const to = 18;
		const move: Move = { from, to };

		expect(move.from).toBe(from);
		expect(move.to).toBe(to);
		expect(move.promotion).toBeUndefined();
	});

	it('should allow a promotion move', () => {
		const from = 48;
		const to = 56;
		const promotion = 'queen' as const;

		const move: Move = {
			from,
			to,
			promotion
		};

		expect(move.from).toBe(from);
		expect(move.to).toBe(to);
		expect(move.promotion).toBe(promotion);
	});

});
