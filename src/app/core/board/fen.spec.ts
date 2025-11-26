import { Board } from './board';
import { loadFEN, boardToFEN } from './fen';

describe('FEN Parser', () => {

	it('should load the initial chess position from FEN', () => {
		const board = new Board();

		loadFEN(board, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

		// a8 → rook black → index 7*8 + 0 = 56
		expect(board.get(56)).toEqual({ type: 'rook', color: 'black' });

		// e1 → king white → rank 0, file 4 → index 4
		expect(board.get(4)).toEqual({ type: 'king', color: 'white' });

		// d8 → queen black → rank 7, file 3 → index 59
		expect(board.get(59)).toEqual({ type: 'queen', color: 'black' });
	});

	it('should load empty squares correctly', () => {
		const board = new Board();

		loadFEN(board, "8/8/8/8/8/8/8/8 w - - 0 1");

		expect(board.squares.every(sq => sq === null)).toBeTruthy();
	});

	it('should throw an error on invalid rank count', () => {
		const board = new Board();

		expect(() => loadFEN(board, "8/8/8/8/8/8/8 w - - 0 1"))
			.toThrowError(/expected 8 ranks/);
	});

	it('should convert a board back to FEN (first field only)', () => {
		const board = new Board();

		loadFEN(board, "8/8/8/3k4/8/8/8/4K3 w - - 0 1");

		const fen = boardToFEN(board);

		expect(fen).toBe("8/8/8/3k4/8/8/8/4K3");
	});

	it('should handle mixed pieces and empty counters correctly', () => {
		const board = new Board();

		loadFEN(board, "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3");

		const fen = boardToFEN(board);

		expect(fen).toBe("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR");
	});

	it('should correctly load pieces in mid-board ranks', () => {
		const board = new Board();

		loadFEN(board, "8/8/8/3P4/4p3/8/8/8 w - - 0 1");

		// white pawn on d5 → rank 4, file 3 → index = 4*8+3 = 35
		expect(board.get(35)).toEqual({ type: 'pawn', color: 'white' });

		// black pawn on e4 → rank 3, file 4 → index = 3*8+4 = 28
		expect(board.get(28)).toEqual({ type: 'pawn', color: 'black' });
	});

	it('should throw on unknown piece character', () => {
		const board = new Board();

		expect(() => loadFEN(board, "8/8/8/8/3X4/8/8/8 w - - 0 1"))
			.toThrowError(/Invalid FEN piece char/);
	});

});
