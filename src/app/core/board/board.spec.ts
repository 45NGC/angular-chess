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

	it('clone() should produce a deep copy of board', () => {
		const board = new Board();
		const piece: Piece = { type: 'queen', color: 'white' };
		board.set(5, piece);

		const cloned = board.clone();

		expect(cloned.get(5)).toEqual(piece);

		expect(cloned).not.toBe(board);
		expect(cloned.squares).not.toBe(board.squares);

		cloned.set(5, null);
		expect(board.get(5)).toEqual(piece);
	});

	it('findKing() should return the correct square of the king', () => {
		const board = new Board();
		const whiteKing: Piece = { type: 'king', color: 'white' };
		const blackKing: Piece = { type: 'king', color: 'black' };

		board.set(7, whiteKing);
		board.set(60, blackKing);

		expect(board.findKing('white')).toBe(7);
		expect(board.findKing('black')).toBe(60);
	});

	it('findKing() should throw if the king is not found', () => {
		const board = new Board();

		expect(() => board.findKing('white'))
			.toThrowError('King of color white not found on board');

		expect(() => board.findKing('black'))
			.toThrowError('King of color black not found on board');
	});
});