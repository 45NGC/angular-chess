import { Injectable } from '@angular/core';
import { GameState } from '../core/rules/game-state';
import { Board, toIndex } from '../core/board/board';
import { Move } from '../core/rules/move';
import { LegalMoveFinder } from '../core/rules/legal-move-finder';
import { loadFEN } from '../core/board/fen';
import { INITIAL_POSITION_FEN } from '../core/constants/chess.constants';
import { IGameService } from './game-service.interface';
import { SoundService } from './sound.service';

@Injectable()
export class LocalGameService implements IGameService {
	state!: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	showGameOverDialog = false;
	showPromotionDialog = false;
	pendingPromotionMoves: Move[] | null = null;

	private moveFinder = new LegalMoveFinder();

	constructor(private soundService: SoundService) {
		this.resetGame();
	}

	resetGame(): void {
		const board = new Board();
		loadFEN(board, INITIAL_POSITION_FEN);
		this.state = new GameState(board);
		this.selectedSquare = null;
		this.legalMoves = [];
		this.showGameOverDialog = false;
		this.showPromotionDialog = false;
		this.pendingPromotionMoves = null;
	}

	handleSquareClick(rank: number, file: number): void {
		const square = toIndex(rank, file);
		const piece = this.state.board.get(square);

		// If a promotion is pending ignore any board clicks
		if (this.pendingPromotionMoves) return;

		// No piece selected yet, only show piece moves if it belongs to the current player
		if (this.selectedSquare === null) {
			if (!piece || piece.color !== this.state.turn) return;
			this.showLegalMoves(square);
			return;
		}

		// A piece is already selected, and the click is on another piece of the same color
		if (piece && piece.color === this.state.turn) {
			this.showLegalMoves(square);
			return;
		}

		// At this point, the click is on an empty square or an opponent's piece.
		// Filter legal moves that end on this square
		const movesToSquare = this.legalMoves.filter(m => m.to === square);

		// If no legal move ends here, cancel the selection
		if (movesToSquare.length === 0) {
			this.selectedSquare = null;
			this.legalMoves = [];
			return;
		}

		if (movesToSquare.length === 1) {
			// Normal move or promotion with a single choice selected by the player
			this.applyMoveAndCheckGameOver(movesToSquare[0]);
			this.selectedSquare = null;
			this.legalMoves = [];
		} else {
			// Multiple promotion choices, open the promotion dialog for 
			// the player to select the promotion
			this.pendingPromotionMoves = movesToSquare;
			this.showPromotionDialog = true;
		}
	}

	private showLegalMoves(square: number): void {
		this.selectedSquare = square;
		this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, square);
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		if (!this.pendingPromotionMoves) return;
		const move = this.pendingPromotionMoves.find(m => m.promotion === pieceType);
		if (move) {
			this.applyMoveAndCheckGameOver(move);
		}
		this.closePromotionDialog();
	}

	closePromotionDialog(): void {
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.selectedSquare = null;
		this.legalMoves = [];
	}

	closeGameOverDialog(): void {
		this.showGameOverDialog = false;
	}

	getResultMessage(): string {
		const result = this.state.result;
		switch (result.type) {
			case 'checkmate':
				return `${result.winner === 'white' ? 'WHITE' : 'BLACK'} WON`;
			case 'stalemate':
				return 'STALEMATE';
			default:
				return '';
		}
	}

	private applyMoveAndCheckGameOver(move: Move): void {
		const capturedPiece = this.state.board.get(move.to);

		this.state.applyMove(move);

		if (capturedPiece) {
			this.soundService.playCapture();
		} else {
			this.soundService.playMove();
		}

		this.checkGameOver();
	}

	private checkGameOver(): void {
		if (this.state.result.type !== 'ongoing') {
			this.showGameOverDialog = true;
		}
	}
}