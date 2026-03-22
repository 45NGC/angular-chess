import { describe, it, expect } from 'vitest';
import { Piece, PieceColor, PieceType, isWhite, isBlack } from './piece';

describe('Piece', () => {

	it('should allow valid piece types', () => {
		const types: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
		expect(types.length).toBe(6);
	});

	it('should allow valid piece colors', () => {
		const colors: PieceColor[] = ['white', 'black'];
		expect(colors.length).toBe(2);
	});

	it('should identify white pieces correctly', () => {
		const piece: Piece = { type: 'pawn', color: 'white' };
		expect(isWhite(piece)).toBeTruthy();
		expect(isBlack(piece)).toBeFalsy();
	});

	it('should identify black pieces correctly', () => {
		const piece: Piece = { type: 'queen', color: 'black' };
		expect(isWhite(piece)).toBeFalsy();
		expect(isBlack(piece)).toBeTruthy();
	});

	it('should return false for null pieces', () => {
		expect(isWhite(null as any)).toBeFalsy();
		expect(isBlack(null as any)).toBeFalsy();
	});
});
