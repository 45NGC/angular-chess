import { Board, fromIndex, isValidSquare, toIndex } from '../board/board';
import { PieceColor } from '../board/piece';
import { Move } from './move';
import { AttackedSquares } from './attacked-squares';
import { MoveSimulator } from './move-simulator';
import {
	BLACK_BACK_RANK,
	BLACK_PAWN_INITIAL_RANK,
	WHITE_BACK_RANK,
	WHITE_PAWN_INITIAL_RANK,
	KNIGHT_OFFSETS,
	KING_OFFSETS,
	BISHOP_DIRECTIONS,
	ROOK_DIRECTIONS,
	QUEEN_DIRECTIONS
} from '../constants/chess.constants';

export class LegalMoveFinder {

	getLegalMoves(board: Board, square: number): Move[] {
		const piece = board.get(square);
		if (!piece) return [];

		const pseudoLegalMoves = this.generatePseudoLegalMoves(board, square, piece.color);
		const legalMoves: Move[] = [];

		for (const move of pseudoLegalMoves) {
			const nextBoard = MoveSimulator.simulate(board, move);
			const isKingInCheck = AttackedSquares.isKingInCheck(nextBoard, piece.color);

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
		const moves: Move[] = [];

		for (const [rankOffset, fileOffset] of KNIGHT_OFFSETS) {
			const targetRank = rank + rankOffset;
			const targetFile = file + fileOffset;

			if (!isValidSquare(targetRank, targetFile)) continue;

			const targetSquare = toIndex(targetRank, targetFile);
			const pieceAtTarget = board.get(targetSquare);

			if (!pieceAtTarget || pieceAtTarget.color !== color) {
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

		// Normal king moves
		for (const [rankOffset, fileOffset] of KING_OFFSETS) {
			const targetRank = rank + rankOffset;
			const targetFile = file + fileOffset;

			if (!isValidSquare(targetRank, targetFile)) continue;

			const targetSquare = toIndex(targetRank, targetFile);
			const pieceAtTarget = board.get(targetSquare);

			if (!pieceAtTarget || pieceAtTarget.color !== color) {
				moves.push({ from: square, to: targetSquare });
			}
		}

		// Castling moves
		this.addCastlingMoves(board, square, color, moves);

		return moves;
	}

	private addCastlingMoves(board: Board, kingSquare: number, color: PieceColor, moves: Move[]): void {
		// King cannot castle if currently in check
		const isKingInCheck = AttackedSquares.isKingInCheck(board, color);
		if (isKingInCheck) return;

		const rights = color === 'white' ? board.castlingRights.white : board.castlingRights.black;
		const homeRank = color === 'white' ? WHITE_BACK_RANK : BLACK_BACK_RANK;

		// King-side castling
		if (rights.short) {
			const rookSquare = toIndex(homeRank, 7);
			const rook = board.get(rookSquare);
			const squaresBetween = [toIndex(homeRank, 5), toIndex(homeRank, 6)];
			const squaresEmpty = squaresBetween.every(sq => !board.get(sq));
			const squaresSafe = squaresBetween.every(sq =>
				!AttackedSquares.isSquareAttacked(board, sq, this.opponent(color))
			);

			if (rook && rook.type === 'rook' && squaresEmpty && squaresSafe) {
				moves.push({
					from: kingSquare,
					to: toIndex(homeRank, 6),
					castling: 'kingSide'
				});
			}
		}

		// Queen-side castling
		if (rights.long) {
			const rookSquare = toIndex(homeRank, 0);
			const rook = board.get(rookSquare);
			const squaresBetween = [toIndex(homeRank, 1), toIndex(homeRank, 2), toIndex(homeRank, 3)];
			const squaresEmpty = squaresBetween.every(sq => !board.get(sq));
			const squaresSafe = [toIndex(homeRank, 2), toIndex(homeRank, 3)].every(sq =>
				!AttackedSquares.isSquareAttacked(board, sq, this.opponent(color))
			);

			if (rook && rook.type === 'rook' && squaresEmpty && squaresSafe) {
				moves.push({
					from: kingSquare,
					to: toIndex(homeRank, 2),
					castling: 'queenSide'
				});
			}
		}
	}

	// ----------------------------------------------------------------
	// PAWN
	// ----------------------------------------------------------------
	private pawnMoves(board: Board, square: number, color: PieceColor): Move[] {
		const { rank, file } = fromIndex(square);
		const moves: Move[] = [];
		const forward = color === 'white' ? 1 : -1;
		const nextRank = rank + forward;

		// Should never happen, but safe.
		if (!isValidSquare(nextRank, file)) return moves;

		const oneStepSquare = toIndex(nextRank, file);
		const isPromotionRank = (color === 'white' && nextRank === BLACK_BACK_RANK) ||
			(color === 'black' && nextRank === WHITE_BACK_RANK);

		// One-step push
		if (!board.get(oneStepSquare)) {
			if (isPromotionRank) {
				this.addPromotions(moves, square, oneStepSquare);
			} else {
				moves.push({ from: square, to: oneStepSquare });
			}
		}

		// Two-step initial push
		const isInitialRank = (color === 'white' && rank === WHITE_PAWN_INITIAL_RANK) ||
			(color === 'black' && rank === BLACK_PAWN_INITIAL_RANK);
		if (isInitialRank && !board.get(oneStepSquare)) {
			const twoStepRank = rank + 2 * forward;
			const twoStepSquare = toIndex(twoStepRank, file);
			if (!board.get(twoStepSquare)) {
				moves.push({ from: square, to: twoStepSquare, doublePush: true });
			}
		}

		// Captures (including en passant)
		const captureFiles = [file - 1, file + 1];
		for (const targetFile of captureFiles) {
			if (!isValidSquare(nextRank, targetFile)) continue;
			const targetSquare = toIndex(nextRank, targetFile);
			const pieceAtTarget = board.get(targetSquare);

			if (pieceAtTarget && pieceAtTarget.color !== color) {
				if (isPromotionRank) {
					this.addPromotions(moves, square, targetSquare);
				} else {
					moves.push({ from: square, to: targetSquare });
				}
			}
		}

		// En passant
		if (board.enPassantTarget !== null) {
			const epRank = color === 'white' ? 4 : 3; // Only possible on rank 4 (white) or 3 (black)
			if (rank === epRank) {
				const epFile = fromIndex(board.enPassantTarget).file;
				if (Math.abs(file - epFile) === 1) {
					const captureSquare = toIndex(nextRank, epFile);
					moves.push({
						from: square,
						to: captureSquare,
						enPassant: true
					});
				}
			}
		}

		return moves;
	}

	private addPromotions(moves: Move[], from: number, to: number): void {
		const promotions: Array<'queen' | 'rook' | 'bishop' | 'knight'> = ['queen', 'rook', 'bishop', 'knight'];
		for (const p of promotions) {
			moves.push({ from, to, promotion: p });
		}
	}

	// ----------------------------------------------------------------
	// SLIDING PIECES (rook, bishop, queen)
	// ----------------------------------------------------------------
	private slidingMoves(
		board: Board,
		square: number,
		color: PieceColor,
		directions: readonly [number, number][]
	): Move[] {
		const { rank, file } = fromIndex(square);
		const moves: Move[] = [];

		for (const [rankOffset, fileOffset] of directions) {
			let targetRank = rank + rankOffset;
			let targetFile = file + fileOffset;

			while (isValidSquare(targetRank, targetFile)) {
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
		return this.slidingMoves(board, square, color, ROOK_DIRECTIONS);
	}

	private bishopMoves(board: Board, square: number, color: PieceColor): Move[] {
		return this.slidingMoves(board, square, color, BISHOP_DIRECTIONS);
	}

	private queenMoves(board: Board, square: number, color: PieceColor): Move[] {
		return this.slidingMoves(board, square, color, QUEEN_DIRECTIONS);
	}
}