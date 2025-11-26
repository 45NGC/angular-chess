
import { Board, fromIndex, toIndex } from '../board/board';
import { PieceColor } from '../board/piece';
import { Move } from './move';

export class LegalMoveFinder {

	getLegalMoves(board: Board, square: number): Move[] {
		const piece = board.get(square);
		if (!piece) return [];

		switch (piece.type) {
			case 'knight':
				return this.knightMoves(board, square, piece.color);

			default:
				return [];
		}
	}

	private knightMoves(board: Board, square: number, color: PieceColor): Move[] {
		const { rank, file } = fromIndex(square);

		const knightMovePattern = [
			[+2, +1], [+2, -1],
			[-2, +1], [-2, -1],
			[+1, +2], [+1, -2],
			[-1, +2], [-1, -2]
		];

		const moves: Move[] = [];

		for (const [rankOffset, fileOffset] of knightMovePattern) {
			const targetRank = rank + rankOffset;
			const targetFile = file + fileOffset;

			const isOutOfBounds = targetRank < 0 || targetRank > 7 || targetFile < 0 || targetFile > 7;

			if (isOutOfBounds) continue;

			const target = toIndex(targetRank, targetFile);
			const pieceAtTarget = board.get(target);

			if (!pieceAtTarget || pieceAtTarget.color !== color) {
				moves.push({ from: square, to: target });
			}
		}

		return moves;
	}

}
