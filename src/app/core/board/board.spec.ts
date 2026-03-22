import { describe, it, expect } from 'vitest';
import { Board, toIndex, fromIndex } from './board';
import { Piece } from './piece';
import { A1, A8, H1, H8 } from '../constants/chess.constants';

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
		board.enPassantTarget = 20;
		board.castlingRights.white.short = false;

		const cloned = board.clone();

		expect(cloned.get(5)).toEqual(piece);

		expect(cloned).not.toBe(board);
		expect(cloned.squares).not.toBe(board.squares);

		cloned.set(5, null);
		expect(board.get(5)).toEqual(piece);

		// Metadata should also be cloned (and not share references)
		expect(cloned.enPassantTarget).toBe(20);
		expect(cloned.castlingRights).not.toBe(board.castlingRights);
		expect(cloned.castlingRights.white).not.toBe(board.castlingRights.white);
		expect(cloned.castlingRights.black).not.toBe(board.castlingRights.black);
		expect(cloned.castlingRights.white.short).toBe(false);
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

	describe('updateCastlingRights()', () => {
		it('disables both castling rights when a king moves', () => {
			const board = new Board();
			const king: Piece = { type: 'king', color: 'white' };

			board.updateCastlingRights({ from: toIndex(0, 4), to: toIndex(0, 5) }, king);

			expect(board.castlingRights.white).toEqual({ short: false, long: false });
			expect(board.castlingRights.black).toEqual({ short: true, long: true });
		});

		it('disables only long side when the white rook moves from a1', () => {
			const board = new Board();
			const rook: Piece = { type: 'rook', color: 'white' };

			board.updateCastlingRights({ from: A1, to: toIndex(0, 1) }, rook);

			expect(board.castlingRights.white.long).toBe(false);
			expect(board.castlingRights.white.short).toBe(true);
		});

		it('disables only short side when the white rook moves from h1', () => {
			const board = new Board();
			const rook: Piece = { type: 'rook', color: 'white' };

			board.updateCastlingRights({ from: H1, to: toIndex(0, 6) }, rook);

			expect(board.castlingRights.white.short).toBe(false);
			expect(board.castlingRights.white.long).toBe(true);
		});

		it('disables only long side when the black rook moves from a8', () => {
			const board = new Board();
			const rook: Piece = { type: 'rook', color: 'black' };

			board.updateCastlingRights({ from: A8, to: toIndex(7, 1) }, rook);

			expect(board.castlingRights.black.long).toBe(false);
			expect(board.castlingRights.black.short).toBe(true);
		});

		it('disables only short side when the black rook moves from h8', () => {
			const board = new Board();
			const rook: Piece = { type: 'rook', color: 'black' };

			board.updateCastlingRights({ from: H8, to: toIndex(7, 6) }, rook);

			expect(board.castlingRights.black.short).toBe(false);
			expect(board.castlingRights.black.long).toBe(true);
		});
	});
});
