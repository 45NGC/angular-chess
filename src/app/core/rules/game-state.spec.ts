import { GameState } from './game-state';
import { Board } from '../board/board';
import { Piece } from '../board/piece';
import { Move } from './move';

describe('GameState', () => {

	it('should initialize with an empty board by default', () => {
		const state = new GameState();
		expect(state.board.squares.length).toBe(64);
	});

	it('should initialize with provided board', () => {
		const initialBoard = new Board();
		initialBoard.set(0, { type: 'rook', color: 'white' });

		const state = new GameState(initialBoard);
		expect(state.board.get(0)).toEqual({ type: 'rook', color: 'white' });
	});

	it('should move a piece and clear the original square', () => {
		const board = new Board();
		const piece: Piece = { type: 'knight', color: 'white' };

		board.set(10, piece);

		const state = new GameState(board);
		const move: Move = { from: 10, to: 18 };
		state.applyMove(move);

		expect(state.board.get(18)).toEqual(piece);
		expect(state.board.get(10)).toBeNull();
	});

	it('should alternate turn after a move', () => {
		const state = new GameState();
		const board = state.board;

		board.set(10, { type: 'pawn', color: 'white' });

		state.applyMove({ from: 10, to: 18 });

		expect(state.turn).toBe('black');
	});

	it('should capture an opposing piece', () => {
		const board = new Board();
		board.set(10, { type: 'bishop', color: 'white' });
		board.set(18, { type: 'pawn', color: 'black' });

		const state = new GameState(board);

		state.applyMove({ from: 10, to: 18 });

		expect(state.board.get(18)).toEqual({ type: 'bishop', color: 'white' });
	});

	//TODO: uncomment when promotions are implemented
	// it('should apply promotion when specified', () => {
	// 	const board = new Board();
	// 	board.set(48, { type: 'pawn', color: 'white' });

	// 	const state = new GameState(board);

	// 	state.applyMove({
	// 		from: 48,
	// 		to: 56,
	// 		promotion: 'queen'
	// 	});

	// 	const piece = state.board.get(56);
	// 	expect(piece?.type).toBe('queen');
	// });

	it('should do nothing if trying to move a non-existent piece', () => {
		const state = new GameState();
		state.applyMove({ from: 20, to: 30 });
		expect(state.board.get(30)).toBeNull();
	});

});
