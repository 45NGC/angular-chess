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

	test("promotes a pawn when move.promotion is set", () => {
		const board = new Board();
		const pawn: Piece = { type: "pawn", color: "white" };
		board.set(48, pawn);
		const move: Move = {
			from: 48,
			to: 56,
			promotion: "queen"
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(56)).toEqual({ type: "queen", color: "white" });
		expect(result.get(48)).toBeNull();
	});

	test("promotion keeps the correct color", () => {
		const board = new Board();
		const pawn: Piece = { type: "pawn", color: "black" };
		board.set(15, pawn);

		const move: Move = {
			from: 15,
			to: 7,
			promotion: "rook"
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(7)).toEqual({ type: "rook", color: "black" });
	});

	test("promotion does not affect other squares", () => {
		const board = new Board();
		const pawn: Piece = { type: "pawn", color: "white" };
		const other: Piece = { type: "knight", color: "black" };

		board.set(48, pawn);
		board.set(22, other);

		const move: Move = {
			from: 48,
			to: 56,
			promotion: "bishop"
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(22)).toEqual(other);
		expect(result.get(48)).toBeNull();
		expect(result.get(56)).toEqual({ type: "bishop", color: "white" });
	});

	test("en passant capture removes the captured pawn", () => {
		const board = new Board();

		const whitePawn: Piece = { type: "pawn", color: "white" };
		const blackPawn: Piece = { type: "pawn", color: "black" };

		// White pawn on e5 (rank 4, file 4)
		// Black pawn on d5 (rank 4, file 3)
		board.set(36, whitePawn); // e5
		board.set(35, blackPawn); // d5

		// En passant target is d6
		board.enPassantTarget = 43; // d6

		const move: Move = {
			from: 36, // e5
			to: 43,   // d6
			enPassant: true
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(43)).toEqual(whitePawn); // pawn moved
		expect(result.get(35)).toBeNull();          // captured pawn removed
		expect(result.get(36)).toBeNull();          // origin cleared
	});

	test("en passant does not affect other pawns", () => {
		const board = new Board();

		const whitePawn: Piece = { type: "pawn", color: "white" };
		const blackPawn: Piece = { type: "pawn", color: "black" };
		const otherPawn: Piece = { type: "pawn", color: "black" };

		board.set(36, whitePawn); // e5
		board.set(35, blackPawn); // d5 (captured)
		board.set(34, otherPawn); // c5 (must stay)

		board.enPassantTarget = 43; // d6

		const move: Move = {
			from: 36,
			to: 43,
			enPassant: true
		};

		const result = MoveSimulator.simulate(board, move);

		expect(result.get(34)).toEqual(otherPawn); // untouched
	});



});
