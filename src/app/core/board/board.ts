import { Piece } from './piece';

export type Square = number; // 0..63

export class Board {
	squares: (Piece | null)[] = new Array(64).fill(null);

	constructor(initial?: (Piece | null)[]) {
		if (initial) this.squares = [...initial];
	}

	get(square: Square): Piece | null {
		return this.squares[square];
	}

	set(square: Square, piece: Piece | null): void {
		this.squares[square] = piece;
	}
}

/**
 * Converts (rank, file) → index 0..63
 * rank: 0..7  → rows (0 = rank 1)
 * file: 0..7  → columns (0 = column a)
 */
export function toIndex(rank: number, file: number): number {
	return rank * 8 + file;
}

/**
 * Converts index 0..63 → { rank, file }
 */
export function fromIndex(index: number): { rank: number; file: number } {
	return {
		rank: Math.floor(index / 8),
		file: index % 8
	};
}
