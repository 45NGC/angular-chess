import { Board, fromIndex, toIndex } from '../board/board';
import { PieceColor } from '../board/piece';
import { SQUARE_COUNT } from '../constants/chess.constants';

export class AttackedSquares {

	static isSquareAttacked(board: Board, squareIndex: number, attackerColor: PieceColor): boolean {
		const attackedSquares = AttackedSquares.getAttackedSquares(board, attackerColor);
		return attackedSquares.has(squareIndex);
	}

	static getAttackedSquares(board: Board, attackerColor: PieceColor): Set<number> {
		const attackedSquares = new Set<number>();

		for (let squareIndex = 0; squareIndex < SQUARE_COUNT; squareIndex++) {
			const pieceOnSquare = board.get(squareIndex);
			if (!pieceOnSquare || pieceOnSquare.color !== attackerColor) continue;

			const { rank, file } = fromIndex(squareIndex);

			switch (pieceOnSquare.type) {
				case 'pawn':
					AttackedSquares.addPawnAttacks(rank, file, attackerColor, attackedSquares);
					break;

				case 'knight':
					AttackedSquares.addKnightAttacks(rank, file, attackedSquares);
					break;

				case 'bishop':
					AttackedSquares.addSlidingAttacks(board, squareIndex, attackedSquares, [
						[1, 1], [1, -1], [-1, 1], [-1, -1]
					]);
					break;

				case 'rook':
					AttackedSquares.addSlidingAttacks(board, squareIndex, attackedSquares, [
						[1, 0], [-1, 0], [0, 1], [0, -1]
					]);
					break;

				case 'queen':
					AttackedSquares.addSlidingAttacks(board, squareIndex, attackedSquares, [
						[1, 1], [1, -1], [-1, 1], [-1, -1],
						[1, 0], [-1, 0], [0, 1], [0, -1]
					]);
					break;

				case 'king':
					AttackedSquares.addKingAttacks(rank, file, attackedSquares);
					break;
			}
		}

		return attackedSquares;
	}

	// ----------------------------------------------------------------
	// PAWN
	// ----------------------------------------------------------------
	private static addPawnAttacks(
		pieceRank: number,
		pieceFile: number,
		color: PieceColor,
		attackedSquares: Set<number>
	) {
		const forwardDirection = color === 'white' ? +1 : -1;

		for (const fileOffset of [-1, +1]) {
			const targetRank = pieceRank + forwardDirection;
			const targetFile = pieceFile + fileOffset;

			const inBounds =
				targetRank >= 0 && targetRank < 8 &&
				targetFile >= 0 && targetFile < 8;

			if (inBounds) {
				attackedSquares.add(toIndex(targetRank, targetFile));
			}
		}
	}

	// ----------------------------------------------------------------
	// KNIGHT
	// ----------------------------------------------------------------
	private static addKnightAttacks(
		pieceRank: number,
		pieceFile: number,
		attackedSquares: Set<number>
	) {
		const knightAttackPattern = [
			[2, 1], [2, -1], [-2, 1], [-2, -1],
			[1, 2], [1, -2], [-1, 2], [-1, -2]
		];

		for (const [rankOffset, fileOffset] of knightAttackPattern) {
			const targetRank = pieceRank + rankOffset;
			const targetFile = pieceFile + fileOffset;

			const inBounds =
				targetRank >= 0 && targetRank < 8 &&
				targetFile >= 0 && targetFile < 8;

			if (inBounds) {
				attackedSquares.add(toIndex(targetRank, targetFile));
			}
		}
	}

	// ----------------------------------------------------------------
	// KING
	// ----------------------------------------------------------------
	private static addKingAttacks(
		pieceRank: number,
		pieceFile: number,
		attackedSquares: Set<number>
	) {
		for (let rankOffset = -1; rankOffset <= 1; rankOffset++) {
			for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {

				if (rankOffset === 0 && fileOffset === 0) continue;

				const targetRank = pieceRank + rankOffset;
				const targetFile = pieceFile + fileOffset;

				const inBounds =
					targetRank >= 0 && targetRank < 8 &&
					targetFile >= 0 && targetFile < 8;

				if (inBounds) {
					attackedSquares.add(toIndex(targetRank, targetFile));
				}
			}
		}
	}

	// ----------------------------------------------------------------
	// SLIDING PIECES (bishop / rook / queen)
	// ----------------------------------------------------------------
	private static addSlidingAttacks(
		board: Board,
		squareIndex: number,
		attackedSquares: Set<number>,
		directions: number[][]
	) {
		const { rank: startRank, file: startFile } = fromIndex(squareIndex);

		for (const [rankOffset, fileOffset] of directions) {

			let targetRank = startRank + rankOffset;
			let targetFile = startFile + fileOffset;

			while (
				targetRank >= 0 && targetRank < 8 &&
				targetFile >= 0 && targetFile < 8
			) {
				const targetSquareIndex = toIndex(targetRank, targetFile);
				attackedSquares.add(targetSquareIndex);

				const pieceOnTarget = board.get(targetSquareIndex);
				if (pieceOnTarget) break; // blocked by any piece

				targetRank += rankOffset;
				targetFile += fileOffset;
			}
		}
	}
}
