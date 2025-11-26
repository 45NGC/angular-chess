import { LegalMoveFinder } from './legal-move-finder';
import { Board } from '../board/board';

describe('LegalMoveFinder', () => {

	it('should return empty array if no piece on square', () => {
		const finder = new LegalMoveFinder();
		const moves = finder.getLegalMoves(new Board(), 10);
		expect(moves.length).toBe(0);
	});

	it('should generate all 8 knight moves from center', () => {
		const board = new Board();
		board.set(27, { type: 'knight', color: 'white' }); // d4

		const finder = new LegalMoveFinder();
		const moves = finder.getLegalMoves(board, 27);

		expect(moves.length).toBe(8);
	});

	it('should generate fewer moves from corner', () => {
		const board = new Board();
		board.set(0, { type: 'knight', color: 'white' }); // a1

		const finder = new LegalMoveFinder();
		const moves = finder.getLegalMoves(board, 0);

		expect(moves.length).toBe(2); // c2 and b3
	});

	it('should not allow landing on a friendly piece', () => {
		const board = new Board();
		board.set(27, { type: 'knight', color: 'white' });
		board.set(36, { type: 'pawn', color: 'white' }); // one possible square

		const finder = new LegalMoveFinder();
		const moves = finder.getLegalMoves(board, 27);

		expect(moves.some(m => m.to === 36)).toBeFalsy();
	});

	it('should allow capturing an enemy piece', () => {
		const board = new Board();
		board.set(27, { type: 'knight', color: 'white' });
		board.set(33, { type: 'pawn', color: 'black' });

		const finder = new LegalMoveFinder();
		const moves = finder.getLegalMoves(board, 27);

		expect(moves.some(move => move.to === 33)).toBeTruthy();
	});

});
