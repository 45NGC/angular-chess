import { describe, it, expect } from 'vitest';
import { MoveSimulator } from './move-simulator';
import { Board, toIndex } from '../board/board';
import { Move } from './move';
import { Piece } from '../board/piece';

describe('MoveSimulator', () => {

	it('moves a piece from source to target', () => {
		const board = new Board();
		const piece: Piece = { type: 'pawn', color: 'white' };
		const from = toIndex(1, 2); // c2
		const to = toIndex(2, 2); // c3
		board.set(from, piece);

		const move: Move = { from, to };

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(to)).toEqual(piece);
	});

	it('clears the original square', () => {
		const board = new Board();
		const piece: Piece = { type: 'rook', color: 'black' };
		const from = toIndex(2, 4); // e3
		const to = toIndex(3, 4); // e4
		board.set(from, piece);

		const move: Move = { from, to };

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(from)).toBeNull();
		expect(result.get(to)).toEqual(piece);
	});

	it('does not modify unrelated squares', () => {
		const board = new Board();

		const piece1: Piece = { type: 'bishop', color: 'white' };
		const piece2: Piece = { type: 'knight', color: 'black' };

		const otherSquare = toIndex(0, 5); // f1
		const from = toIndex(1, 4); // e2
		const to = toIndex(2, 4); // e3
		board.set(otherSquare, piece2);
		board.set(from, piece1);

		const move: Move = { from, to };

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(otherSquare)).toEqual(piece2);
		expect(result.get(from)).toBeNull();
		expect(result.get(to)).toEqual(piece1);
	});

	it('throws if moving from an empty square', () => {
		const board = new Board();

		const move: Move = { from: 30, to: 31 };

		expect(() => MoveSimulator.simulate(board, move))
			.toThrow('Cannot simulate move: no piece at 30');
	});

	it('does not mutate the original board', () => {
		const board = new Board();
		const piece: Piece = { type: 'queen', color: 'white' };
		const from = toIndex(1, 1); // b2
		const to = toIndex(3, 1); // b4
		board.set(from, piece);

		const move: Move = { from, to };

		const result = MoveSimulator.simulate(board, move);

		expect(board.get(from)).toEqual(piece);
		expect(board.get(to)).toBeNull();
		expect(result.get(to)).toEqual(piece);
	});

	it('promotes a pawn when move.promotion is set', () => {
		const board = new Board();
		const pawn: Piece = { type: 'pawn', color: 'white' };
		const from = toIndex(6, 0); // a7
		const to = toIndex(7, 0); // a8
		board.set(from, pawn);
		const move: Move = {
			from,
			to,
			promotion: 'queen'
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(to)).toEqual({ type: 'queen', color: 'white' });
		expect(result.get(from)).toBeNull();
	});

	it('promotion keeps the correct color', () => {
		const board = new Board();
		const pawn: Piece = { type: 'pawn', color: 'black' };
		const from = toIndex(1, 7); // h2
		const to = toIndex(0, 7); // h1
		board.set(from, pawn);

		const move: Move = {
			from,
			to,
			promotion: 'rook'
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(to)).toEqual({ type: 'rook', color: 'black' });
	});

	it('promotion does not affect other squares', () => {
		const board = new Board();
		const pawn: Piece = { type: 'pawn', color: 'white' };
		const other: Piece = { type: 'knight', color: 'black' };

		const from = toIndex(6, 0); // a7
		const to = toIndex(7, 0); // a8
		const otherSquare = toIndex(2, 6); // g3
		board.set(from, pawn);
		board.set(otherSquare, other);

		const move: Move = {
			from,
			to,
			promotion: 'bishop'
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(otherSquare)).toEqual(other);
		expect(result.get(from)).toBeNull();
		expect(result.get(to)).toEqual({ type: 'bishop', color: 'white' });
	});

	it('en passant capture removes the captured pawn', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . . . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . p P . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . . . . .
		 *  -----------------
		 * enPassantTarget: d6, Move: e5 -> d6 (en passant)
		 */
		const board = new Board();

		const whitePawn: Piece = { type: 'pawn', color: 'white' };
		const blackPawn: Piece = { type: 'pawn', color: 'black' };

		const from = toIndex(4, 4); // e5
		const capturedPawnSquare = toIndex(4, 3); // d5
		const to = toIndex(5, 3); // d6

		board.set(from, whitePawn);
		board.set(capturedPawnSquare, blackPawn);
		board.enPassantTarget = to;

		const move: Move = {
			from,
			to,
			enPassant: true
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(to)).toEqual(whitePawn); // pawn moved
		expect(result.get(capturedPawnSquare)).toBeNull(); // captured pawn removed
		expect(result.get(from)).toBeNull(); // origin cleared
	});

	it('en passant does not affect other pawns', () => {
		const board = new Board();

		const whitePawn: Piece = { type: 'pawn', color: 'white' };
		const blackPawn: Piece = { type: 'pawn', color: 'black' };
		const otherPawn: Piece = { type: 'pawn', color: 'black' };

		const from = toIndex(4, 4); // e5
		const capturedPawnSquare = toIndex(4, 3); // d5
		const otherPawnSquare = toIndex(4, 2); // c5
		const to = toIndex(5, 3); // d6

		board.set(from, whitePawn);
		board.set(capturedPawnSquare, blackPawn);
		board.set(otherPawnSquare, otherPawn);

		board.enPassantTarget = to;

		const move: Move = {
			from,
			to,
			enPassant: true
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(otherPawnSquare)).toEqual(otherPawn); // untouched
	});

	it('double pawn push sets enPassantTarget', () => {
		const board = new Board();
		const pawn: Piece = { type: 'pawn', color: 'white' };

		const from = toIndex(1, 4); // e2
		const to = toIndex(3, 4); // e4
		board.set(from, pawn);

		const move: Move = {
			from,
			to
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.enPassantTarget).toBe(toIndex(2, 4)); // e3
	});

	it('non-double pawn move clears enPassantTarget', () => {
		const board = new Board();
		const pawn: Piece = { type: 'pawn', color: 'white' };

		const from = toIndex(1, 4); // e2
		const to = toIndex(2, 4); // e3
		board.set(from, pawn);
		board.enPassantTarget = to;

		const move: Move = {
			from,
			to
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.enPassantTarget).toBeNull();
	});

	it('enPassantTarget is overwritten by the latest double pawn push', () => {
		const board = new Board();

		const whitePawn1: Piece = { type: 'pawn', color: 'white' };
		const whitePawn2: Piece = { type: 'pawn', color: 'white' };

		const e2 = toIndex(1, 4);
		const e4 = toIndex(3, 4);
		const e3 = toIndex(2, 4);
		const d2 = toIndex(1, 3);
		const d4 = toIndex(3, 3);
		const d3 = toIndex(2, 3);

		board.set(e2, whitePawn1);
		board.set(d2, whitePawn2);

		const move1: Move = {
			from: e2,
			to: e4
		};

		const boardAfterFirst = MoveSimulator.simulate(board, move1);

		expect(boardAfterFirst.enPassantTarget).toBe(e3);

		const move2: Move = {
			from: d2,
			to: d4
		};

		const boardAfterSecond = MoveSimulator.simulate(boardAfterFirst, move2);

		expect(boardAfterSecond.enPassantTarget).toBe(d3);
	});

	it('moves the rook when castling king side', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . . . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| . . . . K . . R
		 *  -----------------
		 * Move: e1 -> g1 (castling kingSide), rook: h1 -> f1
		 */
		const board = new Board();
		const king: Piece = { type: 'king', color: 'white' };
		const rook: Piece = { type: 'rook', color: 'white' };

		const kingFrom = toIndex(0, 4); // e1
		const kingTo = toIndex(0, 6); // g1
		const rookFrom = toIndex(0, 7); // h1
		const rookTo = toIndex(0, 5); // f1

		board.set(kingFrom, king);
		board.set(rookFrom, rook);

		const result = MoveSimulator.simulate(board, {
			from: kingFrom,
			to: kingTo,
			castling: 'kingSide'
		});

		expect(result.get(kingTo)).toEqual(king);
		expect(result.get(rookTo)).toEqual(rook);
		expect(result.get(kingFrom)).toBeNull();
		expect(result.get(rookFrom)).toBeNull();
	});

	it('moves the rook when castling queen side', () => {
		/*
		 *    a b c d e f g h
		 *  -----------------
		 * 8| . . . . . . . .
		 * 7| . . . . . . . .
		 * 6| . . . . . . . .
		 * 5| . . . . . . . .
		 * 4| . . . . . . . .
		 * 3| . . . . . . . .
		 * 2| . . . . . . . .
		 * 1| R . . . K . . .
		 *  -----------------
		 * Move: e1 -> c1 (castling queenSide), rook: a1 -> d1
		 */
		const board = new Board();
		const king: Piece = { type: 'king', color: 'white' };
		const rook: Piece = { type: 'rook', color: 'white' };

		const kingFrom = toIndex(0, 4); // e1
		const kingTo = toIndex(0, 2); // c1
		const rookFrom = toIndex(0, 0); // a1
		const rookTo = toIndex(0, 3); // d1

		board.set(kingFrom, king);
		board.set(rookFrom, rook);

		const result = MoveSimulator.simulate(board, {
			from: kingFrom,
			to: kingTo,
			castling: 'queenSide'
		});

		expect(result.get(kingTo)).toEqual(king);
		expect(result.get(rookTo)).toEqual(rook);
		expect(result.get(kingFrom)).toBeNull();
		expect(result.get(rookFrom)).toBeNull();
	});
});
