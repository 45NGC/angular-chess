import { Board, fromIndex, toIndex } from '../board/board';
import { PieceColor } from '../board/piece';
import { Move } from './move';
import { AttackedSquares } from './attacked-squares';
import { MoveSimulator } from './move-simulator';

export class LegalMoveFinder {

	getLegalMoves(board: Board, square: number): Move[] {
		const piece = board.get(square);
		if (!piece) return [];

		const pseudoLegalMoves = this.generatePseudoLegalMoves(board, square, piece.color);
		const legalMoves: Move[] = [];

		for (const move of pseudoLegalMoves) {
			const nextBoard = MoveSimulator.simulate(board, move);

			const kingSquare = nextBoard.findKing(piece.color);
			const isKingInCheck = AttackedSquares.isSquareAttacked(nextBoard, kingSquare, this.opponent(piece.color));

			if (!isKingInCheck) {
				legalMoves.push(move);
			}
		}

		return legalMoves;
	}

	private opponent(color: PieceColor): PieceColor {
		return color === 'white' ? 'black' : 'white';
	}

	// ----------------------------------------------------------------
	// PSEUDO-LEGAL GENERATOR
	// ----------------------------------------------------------------
	private generatePseudoLegalMoves(board: Board, square: number, color: PieceColor): Move[] {
		const piece = board.get(square);
		if (!piece) return [];

		switch (piece.type) {
			case 'knight': return this.knightMoves(board, square, color);
			case 'king': return this.kingMoves(board, square, color);
			case 'pawn': return this.pawnMoves(board, square, color);
			case 'rook': return this.rookMoves(board, square, color);
			case 'bishop': return this.bishopMoves(board, square, color);
			case 'queen': return this.queenMoves(board, square, color);
			default: return [];
		}
	}

	// ----------------------------------------------------------------
	// KNIGHT
	// ----------------------------------------------------------------
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

			const targetSquare = toIndex(targetRank, targetFile);
			const pieceAtTarget = board.get(targetSquare);

			const isCaptureOrEmpty =
				!pieceAtTarget || pieceAtTarget.color !== color;

			if (isCaptureOrEmpty) {
				moves.push({ from: square, to: targetSquare });
			}
		}

		return moves;
	}

	// ----------------------------------------------------------------
	// KING
	// ----------------------------------------------------------------
	private kingMoves(board: Board, square: number, color: PieceColor): Move[] {
		const { rank, file } = fromIndex(square);
		const moves: Move[] = [];

		for (let rankOffset = -1; rankOffset <= 1; rankOffset++) {
			for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {

				if (rankOffset === 0 && fileOffset === 0) continue;

				const targetRank = rank + rankOffset;
				const targetFile = file + fileOffset;

				const isOutOfBounds = targetRank < 0 || targetRank > 7 || targetFile < 0 || targetFile > 7;

				if (isOutOfBounds) continue;

				const targetSquare = toIndex(targetRank, targetFile);
				const pieceAtTarget = board.get(targetSquare);

				const isCaptureOrEmpty =
					!pieceAtTarget || pieceAtTarget.color !== color;

				if (isCaptureOrEmpty) {
					moves.push({ from: square, to: targetSquare });
				}
			}
		}

		return moves;
	}

	// ---------------------------------------------------------------- 
	// PAWN 
	//  --------------------------------------------------------------------
	private pawnMoves(board: Board, square: number, color: PieceColor): Move[] {
		const { rank, file } = fromIndex(square);
		const moves: Move[] = [];

		const forwardDirection = color === 'white' ? +1 : -1;

		// ----------------------------------------------------------------
		// 1 STEP PUSH
		// ----------------------------------------------------------------
		const nextRank = rank + forwardDirection;

		if (nextRank >= 0 && nextRank <= 7) {
			const nextIndex = toIndex(nextRank, file);

			const isPromotionRank =
				(color === 'white' && nextRank === 7) ||
				(color === 'black' && nextRank === 0);

			if (!board.get(nextIndex)) {

				if (isPromotionRank) {
					this.addPromotions(moves, square, nextIndex);
				} else {
					moves.push({ from: square, to: nextIndex });
				}

				// ----------------------------------------------------------------
				// 2 STEPS INITIAL PUSH
				// ----------------------------------------------------------------
				const isPawnOnInitialRank =
					(color === 'white' && rank === 1) ||
					(color === 'black' && rank === 6);

				if (isPawnOnInitialRank) {
					const twoStepRank = rank + forwardDirection * 2;
					const twoStepIndex = toIndex(twoStepRank, file);

					if (!board.get(twoStepIndex)) {
						moves.push({ from: square, to: twoStepIndex });
					}
				}
			}
		}

		// ----------------------------------------------------------------
		// CAPTURES
		// ----------------------------------------------------------------
		const captureOffsets = [-1, +1];

		for (const fileOffset of captureOffsets) {
			const nextRankForCapture = rank + forwardDirection;
			const targetFile = file + fileOffset;

			const isOutOfBounds =
				nextRankForCapture < 0 || nextRankForCapture > 7 ||
				targetFile < 0 || targetFile > 7;

			if (isOutOfBounds) continue;

			const targetSquare = toIndex(nextRankForCapture, targetFile);
			const pieceAtTarget = board.get(targetSquare);

			const isPromotionRank =
				(color === 'white' && nextRankForCapture === 7) ||
				(color === 'black' && nextRankForCapture === 0);

			if (pieceAtTarget && pieceAtTarget.color !== color) {

				if (isPromotionRank) {
					this.addPromotions(moves, square, targetSquare);
				} else {
					moves.push({ from: square, to: targetSquare });
				}
			}
		}

		return moves;
	}

	private addPromotions(moves: Move[], square: number, targetSquare: number) {
		moves.push(
			{ from: square, to: targetSquare, promotion: 'queen' },
			{ from: square, to: targetSquare, promotion: 'rook' },
			{ from: square, to: targetSquare, promotion: 'bishop' },
			{ from: square, to: targetSquare, promotion: 'knight' }
		);
	}



	// ----------------------------------------------------------------
	// SLIDING PIECES (rook/bishop/queen)
	// ----------------------------------------------------------------
	private slidingMoves(
		board: Board,
		square: number,
		color: PieceColor,
		directions: number[][]
	): Move[] {

		const moves: Move[] = [];
		const { rank, file } = fromIndex(square);

		for (const [rankOffset, fileOffset] of directions) {

			let targetRank = rank + rankOffset;
			let targetFile = file + fileOffset;

			while (targetRank >= 0 && targetRank <= 7 && targetFile >= 0 && targetFile <= 7) {

				const targetSquare = toIndex(targetRank, targetFile);
				const pieceAtTarget = board.get(targetSquare);

				if (!pieceAtTarget) {
					moves.push({ from: square, to: targetSquare });
				} else {
					if (pieceAtTarget.color !== color) {
						moves.push({ from: square, to: targetSquare });
					}
					break;
				}

				targetRank += rankOffset;
				targetFile += fileOffset;
			}
		}

		return moves;
	}

	private rookMoves(board: Board, square: number, color: PieceColor): Move[] {
		const rookDirections = [
			[+1, 0], [-1, 0],
			[0, +1], [0, -1]
		];

		return this.slidingMoves(board, square, color, rookDirections);
	}

	private bishopMoves(board: Board, square: number, color: PieceColor): Move[] {
		const bishopDirections = [
			[+1, +1], [+1, -1],
			[-1, +1], [-1, -1]
		];

		return this.slidingMoves(board, square, color, bishopDirections);
	}

	private queenMoves(board: Board, square: number, color: PieceColor): Move[] {
		const queenDirections = [
			[+1, +1], [+1, -1], [-1, +1], [-1, -1],
			[+1, 0], [-1, 0], [0, +1], [0, -1]
		];

		return this.slidingMoves(board, square, color, queenDirections);
	}
}
