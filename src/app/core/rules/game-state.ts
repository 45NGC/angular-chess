
import { Board } from '../board/board';
import { Move } from './move';

export class GameState {

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

		this.turn = this.turn === 'white' ? 'black' : 'white';
	}
}
