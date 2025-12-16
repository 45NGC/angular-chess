import { Board, fromIndex, toIndex } from "../board/board";
import { Move } from "./move";

export class MoveSimulator {

    static simulate(board: Board, move: Move): Board {
        const boardClone = board.clone();
        const piece = boardClone.get(move.from);

        if (!piece) {
            throw new Error(`Cannot simulate move: no piece at ${move.from}`);
        }

        // Reset en passant by default
		boardClone.enPassantTarget = null;

        // ----- EN PASSANT CAPTURE -----
        if (move.enPassant && piece.type === 'pawn') {
            const offsetToCapturedPawn = piece.color === 'white' ? -8 : 8;
            const capturedPawnSquare = move.to + offsetToCapturedPawn;

            boardClone.set(capturedPawnSquare, null);
        }

        // ----- DOUBLE PAWN PUSH (set en passant target) -----
		if (piece.type === 'pawn') {
			const { rank: fromRank, file } = fromIndex(move.from);
			const { rank: toRank } = fromIndex(move.to);

			const isDoublePush = Math.abs(toRank - fromRank) === 2;

			if (isDoublePush) {
				const passedRank = (fromRank + toRank) / 2;
				boardClone.enPassantTarget = toIndex(passedRank, file);
			}
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
