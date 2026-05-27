import { describe, it, expect } from 'vitest';
import { GameState } from './game-state';
import { Board, toIndex } from '../board/board';
import { Move } from './move';

describe('GameState', () => {

	it('should initialize with an empty board by default', () => {
		const state = new GameState();
		expect(state.board.squares.length).toBe(64);
	});

	it('should initialize with provided board', () => {
		const initialBoard = new Board();
		initialBoard.set(0, { type: 'rook', color: 'white' });

		const state = new GameState(initialBoard);
		expect(state.board.get(0)).toEqual({ type: 'rook', color: 'white' });
	});

	it('should move a piece and clear the original square', () => {
		const board = new Board();

		board.set(toIndex(7, 0), { type: 'king', color: 'black' }); // a8
		board.set(toIndex(5, 2), { type: 'king', color: 'white' }); // c6
		board.set(toIndex(1, 2), { type: 'pawn', color: 'white' }); // c2

		const state = new GameState(board);
		const move: Move = { from: toIndex(1, 2), to: toIndex(2, 2) };
		state.applyMove(move);

		expect(state.board.get(toIndex(2, 2))).toEqual({ type: 'pawn', color: 'white' });
		expect(state.board.get(toIndex(1, 2))).toBeNull();
	});

	it('should alternate turn after a move', () => {
		const state = new GameState();
		const board = state.board;

		board.set(toIndex(7, 0), { type: 'king', color: 'black' }); // a8
		board.set(toIndex(5, 2), { type: 'king', color: 'white' }); // c6
		board.set(toIndex(1, 2), { type: 'pawn', color: 'white' }); // c2

		state.applyMove({ from: toIndex(1, 2), to: toIndex(2, 2) });

		expect(state.turn).toBe('black');
	});

	it('should capture an opposing piece', () => {
		const board = new Board();

		board.set(toIndex(7, 0), { type: 'king', color: 'white' }); // a8
		board.set(toIndex(5, 2), { type: 'king', color: 'black' }); // c6
		board.set(toIndex(1, 2), { type: 'bishop', color: 'white' }); // c2
		board.set(toIndex(2, 2), { type: 'pawn', color: 'black' }); // c3

		const state = new GameState(board);

		state.applyMove({ from: toIndex(1, 2), to: toIndex(2, 2) });

		expect(state.board.get(toIndex(2, 2))).toEqual({ type: 'bishop', color: 'white' });
	});

	it('should do nothing if trying to move a non-existent piece', () => {
		const state = new GameState();
		state.applyMove({ from: 20, to: 30 });
		expect(state.board.get(30)).toBeNull();
	});

	it('applies promotion when specified (white pawn, forward move)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| P . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Move: a7 -> a8 =Q
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(6, 0), { type: 'pawn', color: 'white' }); // a7

		const state = new GameState(board);
		state.applyMove({ from: toIndex(6, 0), to: toIndex(7, 0), promotion: 'queen' });

		expect(state.board.get(toIndex(7, 0))).toEqual({ type: 'queen', color: 'white' });
		expect(state.board.get(toIndex(6, 0))).toBeNull();
	});

	it('applies promotion when specified (black pawn, forward move)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| p . . . . . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Black to move: a2 -> a1 =N
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(1, 0), { type: 'pawn', color: 'black' }); // a2

		const state = new GameState(board);
		state.turn = 'black';
		state.applyMove({ from: toIndex(1, 0), to: toIndex(0, 0), promotion: 'knight' });

		expect(state.board.get(toIndex(0, 0))).toEqual({ type: 'knight', color: 'black' });
		expect(state.board.get(toIndex(1, 0))).toBeNull();
	});

	it('applies promotion on capture (white pawn)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . r
		 * 7| . . . . . . P .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Move: g7 x h8 =R
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(6, 6), { type: 'pawn', color: 'white' }); // g7
		board.set(toIndex(7, 7), { type: 'rook', color: 'black' }); // h8

		const state = new GameState(board);
		state.applyMove({ from: toIndex(6, 6), to: toIndex(7, 7), promotion: 'rook' });

		expect(state.board.get(toIndex(7, 7))).toEqual({ type: 'rook', color: 'white' });
		expect(state.board.get(toIndex(6, 6))).toBeNull();
	});

	it('does not apply promotion for non-pawn pieces', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . R . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Move: e2 -> e3 with promotion flag should keep rook
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(1, 4), { type: 'rook', color: 'white' }); // e2

		const state = new GameState(board);
		state.applyMove({ from: toIndex(1, 4), to: toIndex(2, 4), promotion: 'queen' });

		expect(state.board.get(toIndex(2, 4))).toEqual({ type: 'rook', color: 'white' });
	});

	it('double pawn push sets enPassantTarget (white)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . P . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Move: e2 -> e4 (double push), enPassantTarget should be e3
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(1, 4), { type: 'pawn', color: 'white' }); // e2

		const state = new GameState(board);
		state.applyMove({ from: toIndex(1, 4), to: toIndex(3, 4), doublePush: true });

		expect(state.board.enPassantTarget).toBe(toIndex(2, 4)); // e3
	});

	it('double pawn push sets enPassantTarget (black)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . p . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Move: e7 -> e5 (double push), enPassantTarget should be e6
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(6, 4), { type: 'pawn', color: 'black' }); // e7

		const state = new GameState(board);
		state.turn = 'black';
		state.applyMove({ from: toIndex(6, 4), to: toIndex(4, 4), doublePush: true });

		expect(state.board.enPassantTarget).toBe(toIndex(5, 4)); // e6
	});

	it('should detect checkmate', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| k . . . . . . .
		 * 7| . Q . . . . . .
		 * 6| . . K . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . . . . .
		 *  -----------------
		 * Black to move: checkmate
		 */
		const board = new Board();

		board.set(toIndex(7, 0), { type: 'king', color: 'black' }); // a8
		board.set(toIndex(6, 1), { type: 'queen', color: 'white' }); // b7
		board.set(toIndex(5, 2), { type: 'king', color: 'white' }); // c6

		const state = new GameState(board);
		state.turn = 'black';

		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'checkmate',
			winner: 'white'
		});
	});


	it('should detect stalemate', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| k . . . . . . .
		 * 7| . . . . . . . .
		 * 6| . Q K . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . . . . .
		 *  -----------------
		 * Black to move: stalemate
		 */
		const board = new Board();

		board.set(toIndex(7, 0), { type: 'king', color: 'black' }); // a8
		board.set(toIndex(5, 1), { type: 'queen', color: 'white' }); // b6
		board.set(toIndex(5, 2), { type: 'king', color: 'white' }); // c6

		const state = new GameState(board);
		state.turn = 'black';

		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'stalemate'
		});
	});

	it('should detect draw by insufficient material (K vs K)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Draw: insufficient material
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'draw',
			reason: 'insufficientMaterial'
		});
	});

	it('should detect draw by insufficient material (K+B vs K)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . B . K . . .
		 *  -----------------
		 * Draw: insufficient material
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 2), { type: 'bishop', color: 'white' }); // c1

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'draw',
			reason: 'insufficientMaterial'
		});
	});

	it('should detect draw by insufficient material (K+N vs K)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . N . . K . . .
		 *  -----------------
		 * Draw: insufficient material
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 1), { type: 'knight', color: 'white' }); // b1

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'draw',
			reason: 'insufficientMaterial'
		});
	});

	it('should detect draw by insufficient material (K+B vs K+B)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k b . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . B . K . . .
		 *  -----------------
		 * Draw: insufficient material
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 2), { type: 'bishop', color: 'white' }); // c1
		board.set(toIndex(7, 5), { type: 'bishop', color: 'black' }); // f8

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'draw',
			reason: 'insufficientMaterial'
		});
	});

	it('should not mark insufficient material when a mate is possible (K+B+N vs K)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . N B . K . . .
		 *  -----------------
		 * Not a draw (mate possible with B+N)
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 2), { type: 'bishop', color: 'white' }); // c1
		board.set(toIndex(0, 1), { type: 'knight', color: 'white' }); // b1

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'ongoing'
		});
	});

	it('should detect draw by insufficient material (K+B vs K+N)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . n . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . B . K . . .
		 *  -----------------
		 * Draw: insufficient material
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 2), { type: 'bishop', color: 'white' }); // c1
		board.set(toIndex(7, 1), { type: 'knight', color: 'black' }); // b8

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'draw',
			reason: 'insufficientMaterial'
		});
	});

	it('should detect draw by insufficient material (K+N vs K+N)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . n . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . N . . K . . .
		 *  -----------------
		 * Draw: insufficient material
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 1), { type: 'knight', color: 'white' }); // b1
		board.set(toIndex(7, 1), { type: 'knight', color: 'black' }); // b8

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({
			type: 'draw',
			reason: 'insufficientMaterial'
		});
	});

	it('should not detect insufficient material (K+2N vs K)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . N . . N . .
		 * 2| . . . . . . . .
		 * 1| . . . . K . . .
		 *  -----------------
		 * Not a draw (K+2N vs K)
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(2, 2), { type: 'knight', color: 'white' }); // c3
		board.set(toIndex(2, 5), { type: 'knight', color: 'white' }); // f3

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({ type: 'ongoing' });
	});

	it('should not detect insufficient material (K+B vs K+P)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| p . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . B . K . . .
		 *  -----------------
		 * Not a draw (pawn exists)
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 2), { type: 'bishop', color: 'white' }); // c1
		board.set(toIndex(6, 0), { type: 'pawn', color: 'black' }); // a7

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({ type: 'ongoing' });
	});

	it('should not detect insufficient material (K+N vs K+P)', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . k . . .
		 * 7| p . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . N . . K . . .
		 *  -----------------
		 * Not a draw (pawn exists)
		 */
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(0, 1), { type: 'knight', color: 'white' }); // b1
		board.set(toIndex(6, 0), { type: 'pawn', color: 'black' }); // a7

		const state = new GameState(board);
		(state as any).updateGameResult();

		expect(state.result).toEqual({ type: 'ongoing' });
	});

	it('should detect draw by threefold repetition', () => {
		const board = new Board();
		board.set(toIndex(0, 4), { type: 'king', color: 'white' }); // e1
		board.set(toIndex(7, 4), { type: 'king', color: 'black' }); // e8
		board.set(toIndex(1, 0), { type: 'rook', color: 'white' }); // a2
		board.set(toIndex(6, 0), { type: 'rook', color: 'black' }); // a7

		// Keep castling rights stable (repetition depends on them).
		board.castlingRights = {
			white: { short: false, long: false },
			black: { short: false, long: false }
		};

		const state = new GameState(board);

		// Cycle 1 (position repeats once)
		state.applyMove({ from: toIndex(1, 0), to: toIndex(2, 0) }); // Ra2-a3
		state.applyMove({ from: toIndex(6, 0), to: toIndex(5, 0) }); // ra7-a6
		state.applyMove({ from: toIndex(2, 0), to: toIndex(1, 0) }); // Ra3-a2
		state.applyMove({ from: toIndex(5, 0), to: toIndex(6, 0) }); // ra6-a7

		expect(state.result).toEqual({ type: 'ongoing' });

		// Cycle 2 (position repeats for the 3rd time)
		state.applyMove({ from: toIndex(1, 0), to: toIndex(2, 0) }); // Ra2-a3
		state.applyMove({ from: toIndex(6, 0), to: toIndex(5, 0) }); // ra7-a6
		state.applyMove({ from: toIndex(2, 0), to: toIndex(1, 0) }); // Ra3-a2
		state.applyMove({ from: toIndex(5, 0), to: toIndex(6, 0) }); // ra6-a7

		expect(state.result).toEqual({
			type: 'draw',
			reason: 'threefoldRepetition'
		});
	});
});
