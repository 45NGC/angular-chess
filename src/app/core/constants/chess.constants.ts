// ----------------------------------------------------------------
// Board
// ----------------------------------------------------------------

export const BOARD_SIZE = 8;
export const SQUARE_COUNT = 64;

export const WHITE_BACK_RANK = 0;
export const BLACK_BACK_RANK = 7;

export const WHITE_PAWN_INITIAL_RANK = 1;
export const BLACK_PAWN_INITIAL_RANK = 6;

export const H1 = 7;
export const F1 = 5;
export const A1 = 0;
export const D1 = 3;

export const H8 = 63;
export const F8 = 61;
export const A8 = 56;
export const D8 = 59;

export const INITIAL_POSITION_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';



// ----------------------------------------------------------------
// Movement patterns (offsets for pieces)
// ----------------------------------------------------------------

export const KNIGHT_OFFSETS: [number, number][] = [
	[2, 1], [2, -1], [-2, 1], [-2, -1],
	[1, 2], [1, -2], [-1, 2], [-1, -2]
];
export const KING_OFFSETS: [number, number][] = [
	[-1, -1], [-1, 0], [-1, 1],
	[0, -1], [0, 1],
	[1, -1], [1, 0], [1, 1]
];
export const BISHOP_DIRECTIONS: [number, number][] = [
	[1, 1], [1, -1], [-1, 1], [-1, -1]
];
export const ROOK_DIRECTIONS: [number, number][] = [
	[1, 0], [-1, 0], [0, 1], [0, -1]
];
export const QUEEN_DIRECTIONS: [number, number][] = [
	...BISHOP_DIRECTIONS,
	...ROOK_DIRECTIONS
];
