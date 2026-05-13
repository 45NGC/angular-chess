import { Board } from '../board/board';
import { loadFEN } from '../board/fen';
import { INITIAL_POSITION_FEN } from '../constants/chess.constants';
import { GameState } from './game-state';
import { Move } from './move';

export function buildGameStateFromMoves(moves: readonly Move[]): GameState {
	const board = new Board();
	loadFEN(board, INITIAL_POSITION_FEN);
	const state = new GameState(board);
	for (const move of moves) {
		state.applyMove(move);
	}
	return state;
}

