import { fromIndex } from '../board/board';
import { Board } from '../board/board';

type SquareColor = 'light' | 'dark';

function getSquareColor(square: number): SquareColor {
	const { rank, file } = fromIndex(square);
	// a1 is dark (rank 0, file 0) -> even parity
	return (rank + file) % 2 === 0 ? 'dark' : 'light';
}

/**
 * Returns true when the position is a "dead position" due to lack of mating material.
 *
 * This is intentionally conservative (avoid false positives): we only declare a draw in
 * common cases where checkmate is impossible with the remaining material.
 */
export function isInsufficientMaterial(board: Board): boolean {
	let bishops = 0;
	let knights = 0;
	let whiteBishops = 0;
	let blackBishops = 0;
	let whiteKnights = 0;
	let blackKnights = 0;
	const bishopColors = new Set<SquareColor>();

	for (let square = 0; square < board.squares.length; square++) {
		const piece = board.get(square);
		if (!piece) continue;

		switch (piece.type) {
			case 'pawn':
			case 'rook':
			case 'queen':
				return false;
			case 'bishop':
				bishops++;
				if (piece.color === 'white') whiteBishops++;
				else blackBishops++;
				bishopColors.add(getSquareColor(square));
				break;
			case 'knight':
				knights++;
				if (piece.color === 'white') whiteKnights++;
				else blackKnights++;
				break;
			case 'king':
				break;
		}
	}

	const minorPieces = bishops + knights;
	if (minorPieces === 0) return true; // K vs K
	if (minorPieces === 1) return true; // K+{B|N} vs K

	// King + minor vs King + minor (no pawns/rooks/queens): treat as draw in this app.
	const whiteMinors = whiteBishops + whiteKnights;
	const blackMinors = blackBishops + blackKnights;
	if (whiteMinors === 1 && blackMinors === 1) return true;

	// Only bishops, and all bishops are on the same color squares -> no mate possible.
	if (knights === 0 && bishops > 0 && bishopColors.size === 1) return true;

	return false;
}
