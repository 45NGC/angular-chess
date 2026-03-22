import { Board, fromIndex, toIndex } from "../board/board";
import { BOARD_SIZE, A1, A8, D1, D8, F1, F8, H1, H8 } from "../constants/chess.constants";
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

        // Handle special moves
        if (piece.type === 'pawn') {
            this.handlePawnMoves(boardClone, move, piece);
        }

        if (move.castling && piece.type === 'king') {
            this.handleCastling(boardClone, move, piece);
        }

        // Determine the piece to place (handle promotion)
        let pieceToPlace = piece;
        if (move.promotion && piece.type === 'pawn') {
            pieceToPlace = {
                type: move.promotion,
                color: piece.color
            };
        }

        // Move the piece
        boardClone.set(move.to, pieceToPlace);
        boardClone.set(move.from, null);

        return boardClone;
    }

    private static handlePawnMoves(boardClone: Board, move: Move, piece: any): void {
        // En passant capture
        if (move.enPassant) {
            const offsetToCapturedPawn = piece.color === 'white' ? -BOARD_SIZE : BOARD_SIZE;
            const capturedPawnSquare = move.to + offsetToCapturedPawn;
            boardClone.set(capturedPawnSquare, null);
        }

        // Double pawn push (set en passant target)
        const { rank: fromRank, file } = fromIndex(move.from);
        const { rank: toRank } = fromIndex(move.to);
        const isDoublePush = Math.abs(toRank - fromRank) === 2;

        if (isDoublePush) {
            const passedRank = (fromRank + toRank) / 2;
            boardClone.enPassantTarget = toIndex(passedRank, file);
        }
    }

    private static handleCastling(boardClone: Board, move: Move, piece: any): void {
        const isWhite = piece.color === 'white';

        if (move.castling === "kingSide") {
            const rookFrom = isWhite ? H1 : H8;
            const rookTo = isWhite ? F1 : F8;
            const rook = boardClone.get(rookFrom);
            if (!rook || rook.type !== 'rook' || rook.color !== piece.color) return;
            boardClone.set(rookFrom, null);
            boardClone.set(rookTo, rook);
        } else { // queenSide
            const rookFrom = isWhite ? A1 : A8;
            const rookTo = isWhite ? D1 : D8;
            const rook = boardClone.get(rookFrom);
            if (!rook || rook.type !== 'rook' || rook.color !== piece.color) return;
            boardClone.set(rookFrom, null);
            boardClone.set(rookTo, rook);
        }
    }
}
