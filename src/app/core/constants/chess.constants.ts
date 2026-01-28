export const BOARD_SIZE = 8;
export const SQUARE_COUNT = 64;

export const WHITE_BACK_RANK = 0;
export const BLACK_BACK_RANK = 7;

export const WHITE_PAWN_RANK = 1;
export const BLACK_PAWN_RANK = 6;


export const WHITE_KING_SIDE_ROOK_INDEX = 7;
export const WHITE_KING_SIDE_ROOK_CASTLE_INDEX = 5;
export const WHITE_QUEEN_SIDE_ROOK_INDEX = 0;
export const WHITE_QUEEN_SIDE_ROOK_CASTLE_INDEX = 3;

export const BLACK_KING_SIDE_ROOK_INDEX = 63;
export const BLACK_KING_SIDE_ROOK_CASTLE_INDEX = 61;
export const BLACK_QUEEN_SIDE_ROOK_INDEX = 56;
export const BLACK_QUEEN_SIDE_ROOK_CASTLE_INDEX = 59;

export const CASTLING = {
	white: {
		kingSide: { rookFrom: 7, rookTo: 5 },
		queenSide: { rookFrom: 0, rookTo: 3 }
	},
	black: {
		kingSide: { rookFrom: 63, rookTo: 61 },
		queenSide: { rookFrom: 56, rookTo: 59 }
	}
} as const;

