export type PieceColor = 'white' | 'black';

export type PieceType =
	| 'pawn'
	| 'knight'
	| 'bishop'
	| 'rook'
	| 'queen'
	| 'king';

export interface Piece {
	type: PieceType;
	color: PieceColor;
}

export const isWhite = (p: Piece | null): boolean => p?.color === 'white';
export const isBlack = (p: Piece | null): boolean => p?.color === 'black';
