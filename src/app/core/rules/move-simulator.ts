import { Board } from "../board/board";
import { Move } from "./move";

export class MoveSimulator {

    static simulate(board: Board, move: Move): Board {
        const boardClone = board.clone();
        const piece = boardClone.get(move.from);

        if (!piece) {
            throw new Error(`Cannot simulate move: no piece at ${move.from}`);
        }

        boardClone.set(move.to, piece);
        boardClone.set(move.from, null);

        return boardClone;
    }
}
