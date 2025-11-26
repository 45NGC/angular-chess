import { Move } from './move';

describe('Move interface', () => {

	it('should allow a normal move without promotion', () => {
		const move: Move = { from: 10, to: 18 };

		expect(move.from).toBe(10);
		expect(move.to).toBe(18);
		expect(move.promotion).toBeUndefined();
	});

	it('should allow a promotion move', () => {
		const move: Move = {
			from: 48,
			to: 56,
			promotion: 'queen'
		};

		expect(move.from).toBe(48);
		expect(move.to).toBe(56);
		expect(move.promotion).toBe('queen');
	});

});
