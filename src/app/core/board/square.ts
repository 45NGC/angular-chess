export const BOARD_SIZE = 8 as const;
export const SQUARE_COUNT = BOARD_SIZE * BOARD_SIZE;

export type Square = number;

/**
 * Converts (rank, file) → index 0..63
 * rank: 0..7  → rows (0 = rank 1)
 * file: 0..7  → columns (0 = column a)
 */
export function toIndex(rank: number, file: number): Square {
	return rank * BOARD_SIZE + file;
}

/**
 * Converts index 0..63 → { rank, file }
 */
export function fromIndex(square: Square): { rank: number; file: number } {
	return {
		rank: Math.floor(square / BOARD_SIZE),
		file: square % BOARD_SIZE
	};
}

/**
 * Checks if given rank and file are within board limits
 */
export function isValidSquare(rank: number, file: number): boolean {
	return rank >= 0 && rank < BOARD_SIZE && file >= 0 && file < BOARD_SIZE;
}

// ----------------------------------------------------------------
// Common squares (0..63 indices)
// ----------------------------------------------------------------

export const A1 = toIndex(0, 0);
export const D1 = toIndex(0, 3);
export const F1 = toIndex(0, 5);
export const H1 = toIndex(0, 7);

export const A8 = toIndex(7, 0);
export const D8 = toIndex(7, 3);
export const F8 = toIndex(7, 5);
export const H8 = toIndex(7, 7);

