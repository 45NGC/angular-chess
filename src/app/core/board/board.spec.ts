import { Board, toIndex, fromIndex } from './board';
import { Piece } from './piece';

describe('Board', () => {

	it('should create an empty board by default', () => {
		const board = new Board();
		expect(board.squares.length).toBe(64);
		expect(board.squares.every(sq => sq === null)).toBeTruthy();
	});

	it('should allow getting and setting pieces', () => {
		const board = new Board();
		const piece: Piece = { type: 'rook', color: 'white' };

		board.set(0, piece);
		expect(board.get(0)).toEqual(piece);
	});

	it('should correctly convert rank/file to index', () => {
		expect(toIndex(0, 0)).toBe(0);     // a1
		expect(toIndex(7, 7)).toBe(63);    // h8
		expect(toIndex(3, 4)).toBe(28);    // e4
	});

	it('should correctly convert index to rank/file', () => {
		expect(fromIndex(0)).toEqual({ rank: 0, file: 0 });
		expect(fromIndex(63)).toEqual({ rank: 7, file: 7 });
		expect(fromIndex(28)).toEqual({ rank: 3, file: 4 });
	});

	it('should initialize board with provided pieces', () => {
		const initial = Array(64).fill(null);
		const piece: Piece = { type: 'king', color: 'black' };
		initial[10] = piece;

		const board = new Board(initial);

		expect(board.get(10)).toEqual(piece);
	});
});