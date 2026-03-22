import { Board } from '../board/board';
import { SQUARE_COUNT } from '../constants/chess.constants';
import { AttackedSquares } from './attacked-squares';
import { LegalMoveFinder } from './legal-move-finder';
import { Move } from './move';
import { MoveSimulator } from './move-simulator';

export type GameResult =
	| { type: 'ongoing' }
	| { type: 'checkmate', winner: 'white' | 'black' }
	| { type: 'stalemate' }
	| { type: 'timeout', winner: 'white' | 'black' };


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

		const nextBoard = MoveSimulator.simulate(this.board, move);
		nextBoard.updateCastlingRights(move, piece);
		this.board = nextBoard;

		this.turn = this.turn === 'white' ? 'black' : 'white';
		this.updateGameResult();

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

		for (let square = 0; square < SQUARE_COUNT; square++) {
			const piece = this.board.get(square);
			if (!piece || piece.color !== color) continue;

			moves.push(...moveFinder.getLegalMoves(this.board, square));
		}

		return moves;
	}

}
