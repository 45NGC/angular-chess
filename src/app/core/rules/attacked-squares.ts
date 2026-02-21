import { Board, fromIndex, toIndex } from '../board/board';
import { PieceColor } from '../board/piece';
import {
	BOARD_SIZE,
	SQUARE_COUNT,
	KNIGHT_OFFSETS,
	KING_OFFSETS,
	BISHOP_DIRECTIONS,
	ROOK_DIRECTIONS,
	QUEEN_DIRECTIONS
} from '../constants/chess.constants';

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
					AttackedSquares.addSlidingAttacks(board, squareIndex, attackedSquares, BISHOP_DIRECTIONS);
					break;

				case 'rook':
					AttackedSquares.addSlidingAttacks(board, squareIndex, attackedSquares, ROOK_DIRECTIONS);
					break;

				case 'queen':
					AttackedSquares.addSlidingAttacks(board, squareIndex, attackedSquares, QUEEN_DIRECTIONS);
					break;

				case 'king':
					AttackedSquares.addKingAttacks(rank, file, attackedSquares);
					break;
			}
		}

		return attackedSquares;
	}

	private static isValidSquare(rank: number, file: number): boolean {
		return rank >= 0 && rank < BOARD_SIZE && file >= 0 && file < BOARD_SIZE;
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

			if (AttackedSquares.isValidSquare(targetRank, targetFile)) {
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
		for (const [rankOffset, fileOffset] of KNIGHT_OFFSETS) {
			const targetRank = pieceRank + rankOffset;
			const targetFile = pieceFile + fileOffset;

			if (AttackedSquares.isValidSquare(targetRank, targetFile)) {
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
		for (const [rankOffset, fileOffset] of KING_OFFSETS) {
			const targetRank = pieceRank + rankOffset;
			const targetFile = pieceFile + fileOffset;

			if (AttackedSquares.isValidSquare(targetRank, targetFile)) {
				attackedSquares.add(toIndex(targetRank, targetFile));
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
		directions: readonly [number, number][]
	) {
		const { rank: startRank, file: startFile } = fromIndex(squareIndex);

		for (const [rankOffset, fileOffset] of directions) {
			let targetRank = startRank + rankOffset;
			let targetFile = startFile + fileOffset;

			while (AttackedSquares.isValidSquare(targetRank, targetFile)) {
				const targetSquareIndex = toIndex(targetRank, targetFile);
				attackedSquares.add(targetSquareIndex);

				const pieceOnTarget = board.get(targetSquareIndex);
				if (pieceOnTarget) break;

				targetRank += rankOffset;
				targetFile += fileOffset;
			}
		}
	}
}