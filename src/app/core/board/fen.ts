import { Board, toIndex } from './board';
import { Piece, PieceColor, PieceType } from './piece';

// Map from FEN char -> Piece
const FEN_TO_PIECE: Record<string, Piece> = {
	p: { type: 'pawn', color: 'black' },
	n: { type: 'knight', color: 'black' },
	b: { type: 'bishop', color: 'black' },
	r: { type: 'rook', color: 'black' },
	q: { type: 'queen', color: 'black' },
	k: { type: 'king', color: 'black' },

	P: { type: 'pawn', color: 'white' },
	N: { type: 'knight', color: 'white' },
	B: { type: 'bishop', color: 'white' },
	R: { type: 'rook', color: 'white' },
	Q: { type: 'queen', color: 'white' },
	K: { type: 'king', color: 'white' }
};

const PIECE_TO_FEN: Record<PieceType, { white: string; black: string }> = {
	pawn: { white: 'P', black: 'p' },
	knight: { white: 'N', black: 'n' },
	bishop: { white: 'B', black: 'b' },
	rook: { white: 'R', black: 'r' },
	queen: { white: 'Q', black: 'q' },
	king: { white: 'K', black: 'k' },
};

/**
 * Load a FEN string into an existing Board.
 * Only loads the piece placement (first field).
 */
export function loadFEN(board: Board, fen: string): void {
	const [position] = fen.split(' ');
	const ranks = position.split('/');

	if (ranks.length !== 8) {
		throw new Error(`Invalid FEN: expected 8 ranks, got ${ranks.length}`);
	}

	// FEN starts from rank 8 → index ranks[0] is rank 7 internally
	for (let fenRank = 0; fenRank < 8; fenRank++) {
		const rankStr = ranks[fenRank];

		let file = 0;
		for (const char of rankStr) {
			if (isDigit(char)) {
				file += Number(char); // skip empty squares
			} else {
				const piece = FEN_TO_PIECE[char];
				if (!piece) throw new Error(`Invalid FEN piece char: ${char}`);

				const rank = 7 - fenRank; // invert rank to match 0 = rank1
				const index = toIndex(rank, file);
				board.set(index, piece);

				file++;
			}
		}

		if (file !== 8) {
			throw new Error(`Invalid FEN rank: ${rankStr}`);
		}
	}
}

/**
 * Create a FEN string from the board (only the first field the rest will be handled by game-state).
 */
export function boardToFEN(board: Board): string {
	const ranks: string[] = [];

	// FEN rank 8 first → rank index 7 down to 0
	for (let rank = 7; rank >= 0; rank--) {
		let emptyCount = 0;
		let result = '';

		for (let file = 0; file < 8; file++) {
			const piece = board.get(rank * 8 + file);

			if (!piece) {
				emptyCount++;
				continue;
			}

			if (emptyCount > 0) {
				result += emptyCount;
				emptyCount = 0;
			}

			result += PIECE_TO_FEN[piece.type][piece.color];
		}

		if (emptyCount > 0) result += emptyCount;

		ranks.push(result);
	}

	return ranks.join('/');
}

function indexToAlgebraic(index: number): string {
	const file = index % 8;
	const rank = Math.floor(index / 8);
	return `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1}`;
}

function castlingToFEN(board: Board): string {
	let rights = '';
	if (board.castlingRights.white.short) rights += 'K';
	if (board.castlingRights.white.long) rights += 'Q';
	if (board.castlingRights.black.short) rights += 'k';
	if (board.castlingRights.black.long) rights += 'q';
	return rights || '-';
}

/**
 * Build a full FEN from the board + side to move.
 * Halfmove/fullmove are set to 0/1 for now (we don't track them).
 */
export function toFEN(board: Board, turn: PieceColor): string {
	const placement = boardToFEN(board);
	const active = turn === 'white' ? 'w' : 'b';
	const castling = castlingToFEN(board);
	const enPassant = board.enPassantTarget != null ? indexToAlgebraic(board.enPassantTarget) : '-';
	return `${placement} ${active} ${castling} ${enPassant} 0 1`;
}

// Helper
function isDigit(char: string): boolean {
	return char >= '0' && char <= '9';
}
