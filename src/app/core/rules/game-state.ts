
import { Board, fromIndex, toIndex } from '../board/board';
import { A1, A8, D1, D8, F1, F8, H1, H8 } from '../constants/chess.constants';
import { AttackedSquares } from './attacked-squares';
import { LegalMoveFinder } from './legal-move-finder';
import { Move } from './move';

export type GameResult =
	| { type: 'ongoing' }
	| { type: 'checkmate', winner: 'white' | 'black' }
	| { type: 'stalemate' };


export class GameState {

	result: GameResult = { type: 'ongoing' };
	board: Board;
	turn: 'white' | 'black' = 'white';

	constructor(board?: Board) {
		this.board = board ?? new Board();
	}

	applyMove(move: Move): void {
		const piece = this.board.get(move.from);
		if (!piece) return;

		if (move.doublePush) {
			this.handleDoublePush(move);
		} else {
			this.board.enPassantTarget = null;
		}

		this.board.set(move.to, piece);
		this.board.set(move.from, null);

		if (move.enPassant) {
			this.handleEnPassant(move);
		}

		if (move.castling) {
			this.handleCastling(move.castling);
		}

		this.turn = this.turn === 'white' ? 'black' : 'white';

		this.board.updateCastlingRights(move, piece);
		this.updateGameResult();

	}

	private handleDoublePush(move: Move) {
		const { rank, file } = fromIndex(move.from);

		const targetRank = this.turn === 'white' ? rank - 1 : rank + 1;
		this.board.enPassantTarget = toIndex(targetRank, file);
	}

	private handleEnPassant(move: Move) {
		const { rank, file } = fromIndex(move.to);

		const capturedRank = this.turn === 'white' ? rank - 1 : rank + 1;
		const capturedSquare = toIndex(capturedRank, file);
		this.board.set(capturedSquare, null);

	}

	private handleCastling(type: 'kingSide' | 'queenSide'): void {
		const isWhite = this.turn === 'white';

		const rookFrom = isWhite
			? type === 'kingSide' ? H1 : A1
			: type === 'kingSide' ? H8 : A8;

		const rookTo = isWhite
			? type === 'kingSide' ? F1 : D1
			: type === 'kingSide' ? F8 : D8;

		const rook = this.board.get(rookFrom);
		if (!rook) return;

		this.board.set(rookTo, rook);
		this.board.set(rookFrom, null);
	}

	private updateGameResult(): void {
		const color = this.turn;
		const legalMoves = this.getAllLegalMoves(color);

		if (legalMoves.length > 0) {
			this.result = { type: 'ongoing' };
			return;
		}

		const kingSquare = this.board.findKing(color);
		const isInCheck = AttackedSquares.isSquareAttacked(
			this.board,
			kingSquare,
			color === 'white' ? 'black' : 'white'
		);

		if (isInCheck) {
			this.result = {
				type: 'checkmate',
				winner: color === 'white' ? 'black' : 'white'
			};
		} else {
			this.result = { type: 'stalemate' };
		}
	}

	private getAllLegalMoves(color: 'white' | 'black'): Move[] {
		const moves: Move[] = [];
		const moveFinder = new LegalMoveFinder();

		for (let square = 0; square < 64; square++) {
			const piece = this.board.get(square);
			if (!piece || piece.color !== color) continue;

			moves.push(...moveFinder.getLegalMoves(this.board, square));
		}

		return moves;
	}

}
