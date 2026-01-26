
import { Board } from '../board/board';
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

		this.board.set(move.to, piece);
		this.board.set(move.from, null);

		if(move.castling){
			this.handleCastling(move.castling);
		}

		this.turn = this.turn === 'white' ? 'black' : 'white';

		this.board.updateCastlingRights(move, piece);
		this.updateGameResult();
	}

	private handleCastling(type: 'kingSide' | 'queenSide'): void {
		const isWhite = this.turn === 'white';

		const rookFrom = isWhite
			? type === 'kingSide' ? 7 : 0
			: type === 'kingSide' ? 63 : 56;

		const rookTo = isWhite
			? type === 'kingSide' ? 5 : 3
			: type === 'kingSide' ? 61 : 59;

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
