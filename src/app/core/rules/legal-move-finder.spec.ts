import { describe, it, expect, beforeEach } from 'vitest';
import { Board, toIndex, fromIndex } from '../board/board';
import { LegalMoveFinder } from './legal-move-finder';
import { Piece } from '../board/piece';
import { MoveSimulator } from './move-simulator';

function createEmptyBoard(): Board {
	return new Board(new Array(64).fill(null));
}

describe('LegalMoveFinder', () => {
	let moveFinder: LegalMoveFinder;

	beforeEach(() => {
		moveFinder = new LegalMoveFinder();
	});

	// ----------------------------------------------------------------
	// SIMPLE CASES
	// ----------------------------------------------------------------
	it('should return empty array for empty square', () => {
		const board = createEmptyBoard();
		const whiteKing: Piece = { type: 'king', color: 'white' };
		const blackKing: Piece = { type: 'king', color: 'black' };

		board.set(toIndex(0, 4), whiteKing);
		board.set(toIndex(7, 4), blackKing);

		const moves = moveFinder.getLegalMoves(board, toIndex(4, 4));

		expect(moves).toEqual([]);
	});

	// ----------------------------------------------------------------
	// KNIGHT
	// ----------------------------------------------------------------
	describe('Knight', () => {
		it('should return all L-shaped moves when board is empty', () => {
			const board = createEmptyBoard();
			const knight: Piece = { type: 'knight', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const square = toIndex(4, 4);

			board.set(square, knight);
			board.set(toIndex(0, 0), whiteKing);
			board.set(toIndex(7, 7), blackKing);

			const moves = moveFinder.getLegalMoves(board, square);

			const expectedSquares = [
				[6, 5], [6, 3], [2, 5], [2, 3],
				[5, 6], [5, 2], [3, 6], [3, 2]
			].map(([rank, file]) => toIndex(rank, file));

			expect(moves).toHaveLength(8);
			for (const expected of expectedSquares) {
				expect(moves).toContainEqual({ from: square, to: expected });
			}
		});

		it('should not include squares occupied by same color', () => {
			const board = createEmptyBoard();
			const knight: Piece = { type: 'knight', color: 'white' };
			const pawn: Piece = { type: 'pawn', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const square = toIndex(4, 4);
			const blockedSquare = toIndex(6, 5);

			board.set(square, knight);
			board.set(blockedSquare, pawn);
			board.set(toIndex(0, 0), whiteKing);
			board.set(toIndex(7, 7), blackKing);

			const moves = moveFinder.getLegalMoves(board, square);

			expect(moves).not.toContainEqual({ from: square, to: blockedSquare });
			expect(moves).toHaveLength(7);
		});

		it('should include capture squares for opponent pieces', () => {
			const board = createEmptyBoard();
			const knight: Piece = { type: 'knight', color: 'white' };
			const enemyPawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const square = toIndex(4, 4);
			const captureSquare = toIndex(6, 5);

			board.set(square, knight);
			board.set(captureSquare, enemyPawn);
			board.set(toIndex(0, 0), whiteKing);
			board.set(toIndex(7, 7), blackKing);

			const moves = moveFinder.getLegalMoves(board, square);

			expect(moves).toContainEqual({ from: square, to: captureSquare });
		});
	});

	// ----------------------------------------------------------------
	// KING
	// ----------------------------------------------------------------
	describe('King', () => {
		it('should return all 8 surrounding squares when empty', () => {
			const board = createEmptyBoard();
			const king: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const square = toIndex(4, 4);

			board.set(square, king);
			board.set(toIndex(0, 0), blackKing);

			const moves = moveFinder.getLegalMoves(board, square);

			const expectedSquares = [
				[3, 3], [3, 4], [3, 5],
				[4, 3], [4, 5],
				[5, 3], [5, 4], [5, 5]
			].map(([rank, file]) => toIndex(rank, file));

			expect(moves).toHaveLength(8);
			for (const expected of expectedSquares) {
				expect(moves).toContainEqual({ from: square, to: expected });
			}
		});

		it('should not move into check', () => {
			const board = createEmptyBoard();
			const king: Piece = { type: 'king', color: 'white' };
			const enemyRook: Piece = { type: 'rook', color: 'black' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const kingSquare = toIndex(4, 4);
			const rookSquare = toIndex(4, 5);

			board.set(kingSquare, king);
			board.set(rookSquare, enemyRook);
			board.set(toIndex(0, 0), blackKing);

			const moves = moveFinder.getLegalMoves(board, kingSquare);

			expect(moves).toHaveLength(5);
		});

		// CASTLING
		it('allows king side castling when conditions are met', () => {
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
			 * 1| . . . . K . . R
			 *  -----------------
			 * White to move: O-O is legal
			 */
			const board = createEmptyBoard();

			const whiteKing: Piece = { type: 'king', color: 'white' };
			const whiteRook: Piece = { type: 'rook', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			// White pieces
			board.set(toIndex(0, 4), whiteKing); // e1
			board.set(toIndex(0, 7), whiteRook); // h1

			// Black king (required for legality)
			board.set(toIndex(7, 4), blackKing);

			const moves = moveFinder.getLegalMoves(board, toIndex(0, 4));

			expect(moves).toContainEqual({
				from: toIndex(0, 4),
				to: toIndex(0, 6),
				castling: 'kingSide'
			});
		});

		it('allows queen side castling when conditions are met', () => {
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
			 * 1| R . . . K . . .
			 *  -----------------
			 * White to move: O-O-O is legal
			 */
			const board = createEmptyBoard();

			const whiteKing: Piece = { type: 'king', color: 'white' };
			const whiteRook: Piece = { type: 'rook', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			board.set(toIndex(0, 4), whiteKing); // e1
			board.set(toIndex(0, 0), whiteRook); // a1
			board.set(toIndex(7, 4), blackKing);

			const moves = moveFinder.getLegalMoves(board, toIndex(0, 4));

			expect(moves).toContainEqual({
				from: toIndex(0, 4),
				to: toIndex(0, 2),
				castling: 'queenSide'
			});
		});

		it('does not allow castling through check', () => {
			/*
			 *    a b c d e f g h
			 *  -----------------
			 * 8| . . . . k . . .
			 * 7| . . . . . . . .
			 * 6| . . . . . . . .
			 * 5| . . . . . . . .
			 * 4| . . . . . . . .
			 * 3| . . . . . . . .
			 * 2| . . . . . r . .
			 * 1| . . . . K . . R
			 *  -----------------
			 * Black rook attacks f1, so O-O is illegal (king passes through check)
			 */
			const board = createEmptyBoard();

			const whiteKing: Piece = { type: 'king', color: 'white' };
			const whiteRook: Piece = { type: 'rook', color: 'white' };
			const blackRook: Piece = { type: 'rook', color: 'black' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			board.set(toIndex(0, 4), whiteKing); // e1
			board.set(toIndex(0, 7), whiteRook); // h1
			board.set(toIndex(1, 5), blackRook); // f2 (attacks f1)
			board.set(toIndex(7, 4), blackKing);

			const moves = moveFinder.getLegalMoves(board, toIndex(0, 4));

			expect(moves).not.toContainEqual(
				expect.objectContaining({ castling: 'kingSide' })
			);
		});

		it('does not allow castling when the rook is missing', () => {
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
			 * No rook on h1, so O-O is illegal
			 */
			const board = createEmptyBoard();
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			board.set(toIndex(0, 4), whiteKing); // e1
			board.set(toIndex(7, 4), blackKing); // e8

			const moves = moveFinder.getLegalMoves(board, toIndex(0, 4));

			expect(moves).not.toContainEqual(expect.objectContaining({ castling: 'kingSide' }));
		});

		it('does not allow castling when squares between are occupied', () => {
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
			 * 1| . . . . K P . R
			 *  -----------------
			 * A piece on f1 blocks O-O
			 */
			const board = createEmptyBoard();
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const whiteRook: Piece = { type: 'rook', color: 'white' };
			const whitePawn: Piece = { type: 'pawn', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			board.set(toIndex(0, 4), whiteKing); // e1
			board.set(toIndex(0, 7), whiteRook); // h1
			board.set(toIndex(0, 5), whitePawn); // f1
			board.set(toIndex(7, 4), blackKing); // e8

			const moves = moveFinder.getLegalMoves(board, toIndex(0, 4));

			expect(moves).not.toContainEqual(expect.objectContaining({ castling: 'kingSide' }));
		});

		it('does not allow castling when castling rights are disabled', () => {
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
			 * 1| . . . . K . . R
			 *  -----------------
			 * Castling rights short=false, so O-O is illegal
			 */
			const board = createEmptyBoard();
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const whiteRook: Piece = { type: 'rook', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			board.set(toIndex(0, 4), whiteKing); // e1
			board.set(toIndex(0, 7), whiteRook); // h1
			board.set(toIndex(7, 4), blackKing); // e8

			board.castlingRights.white.short = false;

			const moves = moveFinder.getLegalMoves(board, toIndex(0, 4));

			expect(moves).not.toContainEqual(expect.objectContaining({ castling: 'kingSide' }));
		});
	});

	// ----------------------------------------------------------------
	// PAWN
	// ----------------------------------------------------------------
	describe('Pawn', () => {
		it('white pawn on initial rank can move one or two squares forward', () => {
			const board = createEmptyBoard();
			const pawn: Piece = { type: 'pawn', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const pawnSquare = toIndex(1, 0);

			board.set(pawnSquare, pawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			const moves = moveFinder.getLegalMoves(board, pawnSquare);

			const expected = [
				{ from: pawnSquare, to: toIndex(2, 0) },
				{ from: pawnSquare, to: toIndex(3, 0), doublePush: true }
			];

			expect(moves).toEqual(expected);
		});

		it('white pawn not on initial rank can only move one square', () => {
			const board = createEmptyBoard();
			const pawn: Piece = { type: 'pawn', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const pawnSquare = toIndex(2, 0);

			board.set(pawnSquare, pawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			const moves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(moves).toEqual([{ from: pawnSquare, to: toIndex(3, 0) }]);
		});

		it('white pawn can capture diagonally', () => {
			const board = createEmptyBoard();
			const whitePawn: Piece = { type: 'pawn', color: 'white' };
			const blackPawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const pawnSquare = toIndex(1, 1);
			const blackPawnSquare = toIndex(2, 2);

			board.set(pawnSquare, whitePawn);
			board.set(blackPawnSquare, blackPawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			const moves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(moves).toContainEqual({ from: pawnSquare, to: toIndex(2, 1) });
			expect(moves).toContainEqual({ from: pawnSquare, to: toIndex(3, 1), doublePush: true });
			expect(moves).toContainEqual({ from: pawnSquare, to: blackPawnSquare });
		});

		it('pawn cannot move forward if blocked', () => {
			const board = createEmptyBoard();
			const whitePawn: Piece = { type: 'pawn', color: 'white' };
			const blackPawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const pawnSquare = toIndex(1, 0);
			const blockerSquare = toIndex(2, 0);

			board.set(pawnSquare, whitePawn);
			board.set(blockerSquare, blackPawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			const moves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(moves).toEqual([]);
		});

		// ------------------------------------------------------------
		// PROMOTIONS
		// ------------------------------------------------------------
		it('white pawn promotes when moving forward into last rank', () => {
			const board = createEmptyBoard();
			const pawn: Piece = { type: 'pawn', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare = toIndex(6, 3);       // d7
			const target = toIndex(7, 3);           // d8

			board.set(pawnSquare, pawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(0, 7), blackKing);

			const pawnMoves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'queen' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'rook' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'bishop' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'knight' });

			expect(pawnMoves).toHaveLength(4);
		});

		it('white pawn promotes when capturing into last rank', () => {
			const board = createEmptyBoard();
			const pawn: Piece = { type: 'pawn', color: 'white' };
			const enemy: Piece = { type: 'rook', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare = toIndex(6, 3);         // d7
			const enemySquare = toIndex(7, 4);        // e8

			board.set(pawnSquare, pawn);
			board.set(enemySquare, enemy);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(0, 7), blackKing);

			const pawnMoves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'queen' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'rook' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'bishop' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'knight' });

			// It only has this moves available because the king is under attack, so the pawn can not 
			// promote going forward because this would let the king under attack of the black rook
			expect(pawnMoves).toHaveLength(4);
		});

		it('black pawn promotes when moving forward into last rank', () => {
			const board = createEmptyBoard();
			const pawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare = toIndex(1, 3);       // d2
			const target = toIndex(0, 3);           // d1

			board.set(pawnSquare, pawn);
			board.set(toIndex(7, 4), blackKing);
			board.set(toIndex(7, 7), whiteKing);

			const pawnMoves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'queen' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'rook' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'bishop' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: target, promotion: 'knight' });

			expect(pawnMoves).toHaveLength(4);
		});

		it('black pawn promotes when capturing into last rank', () => {
			const board = createEmptyBoard();
			const pawn: Piece = { type: 'pawn', color: 'black' };
			const enemy: Piece = { type: 'queen', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare = toIndex(1, 3);       // d2
			const enemySquare = toIndex(0, 2);      // c1

			board.set(pawnSquare, pawn);
			board.set(enemySquare, enemy);
			board.set(toIndex(7, 2), blackKing);
			board.set(toIndex(7, 7), whiteKing);

			const pawnMoves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'queen' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'rook' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'bishop' });
			expect(pawnMoves).toContainEqual({ from: pawnSquare, to: enemySquare, promotion: 'knight' });

			// It only has this moves available because the king is under attack, so the pawn can not 
			// promote going forward because this would let the king under attack of the white queen
			expect(pawnMoves).toHaveLength(4);
		});

		it('white pawn can capture en passant to the right', () => {
			const board = createEmptyBoard();
			const whitePawn: Piece = { type: 'pawn', color: 'white' };
			const blackPawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare = toIndex(4, 4); // e5
			const enemyPawnSquare = toIndex(4, 5); // f5

			board.set(pawnSquare, whitePawn);
			board.set(enemyPawnSquare, blackPawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			// en passant target = f6
			board.enPassantTarget = toIndex(5, 5);

			const moves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(moves).toContainEqual({
				from: pawnSquare,
				to: toIndex(5, 5),
				enPassant: true
			});
		});

		it('white pawn cannot capture en passant if enPassantTarget is null', () => {
			const board = createEmptyBoard();
			const whitePawn: Piece = { type: 'pawn', color: 'white' };
			const blackPawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare = toIndex(4, 4); // e5
			const enemyPawnSquare = toIndex(4, 5); // f5

			board.set(pawnSquare, whitePawn);
			board.set(enemyPawnSquare, blackPawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			board.enPassantTarget = null;

			const moves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(moves.some(m => m.enPassant)).toBe(false);
		});

		it('en passant removes the captured pawn when simulated', () => {
			const board = createEmptyBoard();
			const whitePawn: Piece = { type: 'pawn', color: 'white' };
			const blackPawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare = toIndex(4, 4); // e5
			const enemyPawnSquare = toIndex(4, 5); // f5

			board.set(pawnSquare, whitePawn);
			board.set(enemyPawnSquare, blackPawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			board.enPassantTarget = toIndex(5, 5);

			const enPassantMove = {
				from: pawnSquare,
				to: toIndex(5, 5),
				enPassant: true
			};

			const result = MoveSimulator.simulate(board, enPassantMove);

			expect(result.get(enemyPawnSquare)).toBeNull();
			expect(result.get(toIndex(5, 5))).toEqual(whitePawn);
		});

		it('only adjacent pawns can capture en passant', () => {
			const board = createEmptyBoard();
			const whitePawn1: Piece = { type: 'pawn', color: 'white' };
			const whitePawn2: Piece = { type: 'pawn', color: 'white' };
			const whitePawn3: Piece = { type: 'pawn', color: 'white' };
			const blackPawn: Piece = { type: 'pawn', color: 'black' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const pawnSquare1 = toIndex(4, 4); // e5
			const pawnSquare2 = toIndex(4, 6); // g5
			const pawnSquare3 = toIndex(4, 2); // c5
			const enemyPawnSquare = toIndex(4, 5); // f5

			board.set(pawnSquare1, whitePawn1);
			board.set(pawnSquare2, whitePawn2);
			board.set(pawnSquare3, whitePawn3);
			board.set(enemyPawnSquare, blackPawn);
			board.set(toIndex(0, 4), whiteKing);
			board.set(toIndex(7, 4), blackKing);

			board.enPassantTarget = toIndex(5, 5);

			const pawn1Moves = moveFinder.getLegalMoves(board, pawnSquare1);
			const pawn2Moves = moveFinder.getLegalMoves(board, pawnSquare2);
			const pawn3Moves = moveFinder.getLegalMoves(board, pawnSquare3);

			expect(pawn1Moves.some(m => m.enPassant)).toBe(true);
			expect(pawn2Moves.some(m => m.enPassant)).toBe(true);
			expect(pawn3Moves.some(m => m.enPassant)).toBe(false);
		});

	});

	// ----------------------------------------------------------------
	// ROOK
	// ----------------------------------------------------------------
	describe('Rook', () => {
		it('can move horizontally and vertically until blocked', () => {
			const board = createEmptyBoard();
			const rook: Piece = { type: 'rook', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const rookSquare = toIndex(4, 4);

			board.set(rookSquare, rook);
			board.set(toIndex(0, 0), whiteKing);
			board.set(toIndex(7, 7), blackKing);

			const moves = moveFinder.getLegalMoves(board, rookSquare);

			expect(moves).toHaveLength(14);
		});

		it('cannot move through friendly pieces', () => {
			const board = createEmptyBoard();
			const rook: Piece = { type: 'rook', color: 'white' };
			const pawn: Piece = { type: 'pawn', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const rookSquare = toIndex(0, 0);
			const blockerSquare = toIndex(0, 1);

			board.set(rookSquare, rook);
			board.set(blockerSquare, pawn);
			board.set(toIndex(7, 0), whiteKing);
			board.set(toIndex(7, 7), blackKing);

			const moves = moveFinder.getLegalMoves(board, rookSquare);

			expect(moves).toHaveLength(6);
			expect(moves).not.toContainEqual({ from: rookSquare, to: blockerSquare });
		});
	});

	// ----------------------------------------------------------------
	// BISHOP
	// ----------------------------------------------------------------
	describe('Bishop', () => {
		it('can move diagonally until blocked', () => {
			const board = createEmptyBoard();
			const bishop: Piece = { type: 'bishop', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const bishopSquare = toIndex(4, 4);

			board.set(bishopSquare, bishop);
			board.set(toIndex(0, 7), whiteKing);
			board.set(toIndex(7, 0), blackKing);

			const moves = moveFinder.getLegalMoves(board, bishopSquare);

			expect(moves).toHaveLength(13);
		});
	});

	// ----------------------------------------------------------------
	// QUEEN
	// ----------------------------------------------------------------
	describe('Queen', () => {
		it('can move like rook and bishop combined', () => {
			const board = createEmptyBoard();
			const queen: Piece = { type: 'queen', color: 'white' };
			const whiteKing: Piece = { type: 'king', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };
			const queenSquare = toIndex(4, 4);

			board.set(queenSquare, queen);
			board.set(toIndex(0, 7), whiteKing);
			board.set(toIndex(7, 0), blackKing);

			const moves = moveFinder.getLegalMoves(board, queenSquare);

			expect(moves).toHaveLength(27);
		});
	});

	// ----------------------------------------------------------------
	// CHECKS
	// ----------------------------------------------------------------
	describe('Check detection', () => {
		it('should not allow moves that leave king in check', () => {
			const board = createEmptyBoard();
			const king: Piece = { type: 'king', color: 'white' };
			const enemyRook: Piece = { type: 'rook', color: 'black' };
			const pawn: Piece = { type: 'pawn', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const kingSquare = toIndex(1, 3);
			const enemyRookSquare = toIndex(1, 5);
			const pawnSquare = toIndex(1, 4);

			board.set(kingSquare, king);
			board.set(enemyRookSquare, enemyRook);
			board.set(pawnSquare, pawn);
			board.set(toIndex(7, 0), blackKing);

			const moves = moveFinder.getLegalMoves(board, pawnSquare);

			expect(moves).toEqual([]);
		});

		it('should not allow moves that leave king in check (pinned piece example with knight)', () => {
			const board = createEmptyBoard();
			const king: Piece = { type: 'king', color: 'white' };
			const enemyRook: Piece = { type: 'rook', color: 'black' };
			const knight: Piece = { type: 'knight', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const kingSquare = toIndex(0, 4);        // e1
			const enemyRookSquare = toIndex(7, 4);   // e8
			const knightSquare = toIndex(1, 4);      // e2

			board.set(kingSquare, king);
			board.set(enemyRookSquare, enemyRook);
			board.set(knightSquare, knight);
			board.set(toIndex(7, 0), blackKing);

			const moves = moveFinder.getLegalMoves(board, knightSquare);

			expect(moves).toEqual([]);
		});

		it('should allow moves that block the check', () => {
			const board = createEmptyBoard();
			const king: Piece = { type: 'king', color: 'white' };
			const enemyRook: Piece = { type: 'rook', color: 'black' };
			const rook: Piece = { type: 'rook', color: 'white' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const kingSquare = toIndex(0, 4);
			const enemyRookSquare = toIndex(7, 4);
			const rookSquare = toIndex(1, 4);

			board.set(kingSquare, king);
			board.set(enemyRookSquare, enemyRook);
			board.set(rookSquare, rook);
			board.set(toIndex(7, 0), blackKing);

			const moves = moveFinder.getLegalMoves(board, rookSquare);

			expect(moves).toContainEqual({ from: rookSquare, to: toIndex(2, 4) });
		});

		it('should allow king to capture checking piece', () => {
			const board = createEmptyBoard();
			const king: Piece = { type: 'king', color: 'white' };
			const enemyRook: Piece = { type: 'rook', color: 'black' };
			const blackKing: Piece = { type: 'king', color: 'black' };

			const kingSquare = toIndex(0, 4);
			const rookSquare = toIndex(1, 4);

			board.set(kingSquare, king);
			board.set(rookSquare, enemyRook);
			board.set(toIndex(7, 7), blackKing);

			const moves = moveFinder.getLegalMoves(board, kingSquare);

			expect(moves).toContainEqual({ from: kingSquare, to: rookSquare });
		});
	});

	// ----------------------------------------------------------------
	// SPECIAL CASES
	// ----------------------------------------------------------------
	it('should handle edge of board correctly', () => {
		const board = createEmptyBoard();
		const knight: Piece = { type: 'knight', color: 'white' };
		const whiteKing: Piece = { type: 'king', color: 'white' };
		const blackKing: Piece = { type: 'king', color: 'black' };
		const square = toIndex(0, 0); // Corner

		board.set(square, knight);
		board.set(toIndex(0, 7), whiteKing);
		board.set(toIndex(7, 7), blackKing);

		const moves = moveFinder.getLegalMoves(board, square);

		// A knight in a corner only has 2 available squares
		expect(moves).toHaveLength(2);
		expect(moves).toContainEqual({ from: square, to: toIndex(1, 2) });
		expect(moves).toContainEqual({ from: square, to: toIndex(2, 1) });
	});

	it('should only return moves for piece of correct color', () => {
		const board = createEmptyBoard();
		const whiteKnight: Piece = { type: 'knight', color: 'white' };
		const blackKnight: Piece = { type: 'knight', color: 'black' };
		const whiteKing: Piece = { type: 'king', color: 'white' };
		const blackKing: Piece = { type: 'king', color: 'black' };
		const whiteKnightSquare = toIndex(4, 4);
		const blackKnightSquare = toIndex(4, 3);

		board.set(whiteKnightSquare, whiteKnight);
		board.set(blackKnightSquare, blackKnight);
		board.set(toIndex(0, 0), whiteKing);
		board.set(toIndex(7, 7), blackKing);

		const whiteMoves = moveFinder.getLegalMoves(board, whiteKnightSquare);
		const blackMoves = moveFinder.getLegalMoves(board, blackKnightSquare);

		expect(whiteMoves.length).toBeGreaterThan(0);
		expect(blackMoves.length).toBeGreaterThan(0);

		expect(whiteMoves).not.toEqual(blackMoves);
	});
});
