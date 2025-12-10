import { Board } from "../board/board";
import { Move } from "./move";

export class MoveSimulator {

    static simulate(board: Board, move: Move): Board {
        const boardClone = board.clone();
        const piece = boardClone.get(move.from);

        if (!piece) {
            throw new Error(`Cannot simulate move: no piece at ${move.from}`);
        }

        // ----- PROMOTION -----
        let pieceToPlace = piece;
        if (move.promotion && piece.type === 'pawn') {
            pieceToPlace = {
                type: move.promotion,
                color: piece.color
            };
        }

        boardClone.set(move.to, pieceToPlace);
        boardClone.set(move.from, null);

        return boardClone;
    }
}
