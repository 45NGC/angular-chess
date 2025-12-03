import { MoveSimulator } from "./move-simulator";
import { Board } from "../board/board";
import { Move } from "./move";
import { Piece } from "../board/piece";

describe("MoveSimulator", () => {

	test("moves a piece from source to target", () => {
		const board = new Board();
		const piece: Piece = { type: "pawn", color: "white" };
		board.set(10, piece);

		const move: Move = { from: 10, to: 18 };

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(18)).toEqual(piece);
	});

	test("clears the original square", () => {
		const board = new Board();
		const piece: Piece = { type: "rook", color: "black" };
		board.set(20, piece);

		const move: Move = { from: 20, to: 28 };

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(20)).toBeNull();
		expect(result.get(28)).toEqual(piece);
	});

	test("does not modify unrelated squares", () => {
		const board = new Board();

		const piece1: Piece = { type: "bishop", color: "white" };
		const piece2: Piece = { type: "knight", color: "black" };

		board.set(5, piece2);
		board.set(12, piece1);

		const move: Move = { from: 12, to: 20 };

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(5)).toEqual(piece2);
		expect(result.get(12)).toBeNull();
		expect(result.get(20)).toEqual(piece1);
	});

	test("throws if moving from an empty square", () => {
		const board = new Board();

		const move: Move = { from: 30, to: 31 };

		expect(() => MoveSimulator.simulate(board, move))
			.toThrow("Cannot simulate move: no piece at 30");
	});

	test("does not mutate the original board", () => {
		const board = new Board();
		const piece: Piece = { type: "queen", color: "white" };
		board.set(9, piece);

		const move: Move = { from: 9, to: 25 };

		const result = MoveSimulator.simulate(board, move);

		expect(board.get(9)).toEqual(piece);
		expect(board.get(25)).toBeNull();
		expect(result.get(25)).toEqual(piece);
	});

});
