import { describe, it, expect } from 'vitest';
import { Board, toIndex } from '../board/board';
import { AttackedSquares } from './attacked-squares';
import { Piece } from '../board/piece';

function createEmptyBoard(): Board {
	return new Board(new Array(64).fill(null));
}

describe('AttackedSquares', () => {

	// ----------------------------------------------------------------
	// PAWN
	// ----------------------------------------------------------------
	it('white pawn should attack diagonally (rank+1, file±1)', () => {
		const board = createEmptyBoard();
		const pawn: Piece = { type: 'pawn', color: 'white' }

		const square = toIndex(3, 3);
		board.set(square, pawn);

		const attacked = AttackedSquares.getAttackedSquares(board, 'white');

		expect(attacked.has(toIndex(4, 2))).toBe(true);
		expect(attacked.has(toIndex(4, 4))).toBe(true);
	});

	it('black pawn should attack diagonally (rank-1, file±1)', () => {
		const board = createEmptyBoard();
		const pawn: Piece = { type: 'pawn', color: 'black' };

		const square = toIndex(4, 4);
		board.set(square, pawn);

		const attacked = AttackedSquares.getAttackedSquares(board, 'black');

		expect(attacked.has(toIndex(3, 3))).toBe(true);
		expect(attacked.has(toIndex(3, 5))).toBe(true);
	});

	// ----------------------------------------------------------------
	// KNIGHT
	// ----------------------------------------------------------------
	it('knight should attack 8 L-shaped squares', () => {
		const board = createEmptyBoard();
		const knight: Piece = { type: 'knight', color: 'white' };

		const square = toIndex(4, 4);
		board.set(square, knight);

		const attacked = AttackedSquares.getAttackedSquares(board, 'white');

		const moves = [
			[6, 5], [6, 3], [2, 5], [2, 3],
			[5, 6], [5, 2], [3, 6], [3, 2]
		];

		for (const [r, f] of moves) {
			expect(attacked.has(toIndex(r, f))).toBe(true);
		}
	});

	// ----------------------------------------------------------------
	// KING
	// ----------------------------------------------------------------
	it('king should attack all 8 surrounding squares', () => {
		const board = createEmptyBoard();
		const king: Piece = { type: 'king', color: 'white' };

		const square = toIndex(4, 4);
		board.set(square, king);

		const attacked = AttackedSquares.getAttackedSquares(board, 'white');

		const neighbors = [
			[3, 3], [3, 4], [3, 5],
			[4, 3], [4, 5],
			[5, 3], [5, 4], [5, 5]
		];

		for (const [r, f] of neighbors) {
			expect(attacked.has(toIndex(r, f))).toBe(true);
		}
	});

	// ----------------------------------------------------------------
	// ROOK (sliding)
	// ----------------------------------------------------------------
	it('rook should attack along ranks and files until blocked', () => {
		const board = createEmptyBoard();
		const rook: Piece = { type: 'rook', color: 'white' };

		const square = toIndex(4, 4);
		board.set(square, rook);

		const attacked = AttackedSquares.getAttackedSquares(board, 'white');

		// Check example squares horizontally and vertically
		expect(attacked.has(toIndex(4, 0))).toBe(true);
		expect(attacked.has(toIndex(4, 7))).toBe(true);
		expect(attacked.has(toIndex(0, 4))).toBe(true);
		expect(attacked.has(toIndex(7, 4))).toBe(true);
	});

	it('rook attack should stop when blocked by any piece', () => {
		const board = createEmptyBoard();
		const rook: Piece = { type: 'rook', color: 'white' };
		const blocker: Piece = { type: 'pawn', color: 'white' };

		const rookSquare = toIndex(4, 4);
		const blockerSquare = toIndex(4, 6);

		board.set(rookSquare, rook);
		board.set(blockerSquare, blocker);

		const attacked = AttackedSquares.getAttackedSquares(board, 'white');

		expect(attacked.has(blockerSquare)).toBe(true);
		// Should NOT attack past the blocker
		expect(attacked.has(toIndex(4, 7))).toBe(false);
	});

	// ----------------------------------------------------------------
	// BISHOP (sliding)
	// ----------------------------------------------------------------
	it('bishop should attack diagonally', () => {
		const board = createEmptyBoard();
		const bishop: Piece = { type: 'bishop', color: 'white' };

		const square = toIndex(4, 4);
		board.set(square, bishop);

		const attacked = AttackedSquares.getAttackedSquares(board, 'white');

		expect(attacked.has(toIndex(5, 5))).toBe(true);
		expect(attacked.has(toIndex(6, 6))).toBe(true);
		expect(attacked.has(toIndex(3, 3))).toBe(true);
		expect(attacked.has(toIndex(2, 2))).toBe(true);
	});

	// ----------------------------------------------------------------
	// QUEEN (sliding)
	// ----------------------------------------------------------------
	it('queen should attack like rook + bishop', () => {
		const board = createEmptyBoard();
		const queen: Piece = { type: 'queen', color: 'white' };

		const square = toIndex(4, 4);
		board.set(square, queen);

		const attacked = AttackedSquares.getAttackedSquares(board, 'white');

		// Rook-like
		expect(attacked.has(toIndex(4, 0))).toBe(true);
		expect(attacked.has(toIndex(7, 4))).toBe(true);

		// Bishop-like
		expect(attacked.has(toIndex(6, 6))).toBe(true);
		expect(attacked.has(toIndex(2, 6))).toBe(true);
	});

	// ----------------------------------------------------------------
	// isSquareAttacked
	// ----------------------------------------------------------------
	it('isSquareAttacked should return true if the square is attacked', () => {
		const board = createEmptyBoard();

		const knight: Piece = { type: 'knight', color: 'white' };
		const knightSquare = toIndex(4, 4);
		board.set(knightSquare, knight);

		// One of the knight attacked squares
		const target = toIndex(6, 5);

		expect(
			AttackedSquares.isSquareAttacked(board, target, 'white')
		).toBe(true);
	});

	it('isSquareAttacked should return false if not attacked', () => {
		const board = createEmptyBoard();

		const knight: Piece = { type: 'knight', color: 'white' };
		const knightSquare = toIndex(4, 4);
		board.set(knightSquare, knight);

		// Knight does NOT attack (0,0)
		expect(
			AttackedSquares.isSquareAttacked(board, toIndex(0, 0), 'white')
		).toBe(false);
	});

});
