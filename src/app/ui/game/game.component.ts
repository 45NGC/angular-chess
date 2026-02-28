import { Component, OnInit } from '@angular/core';
import { GameState } from '../../core/rules/game-state';
import { CommonModule } from '@angular/common';
import { loadFEN } from '../../core/board/fen';
import { Board, toIndex } from '../../core/board/board';
import { Move } from '../../core/rules/move';
import { LegalMoveFinder } from '../../core/rules/legal-move-finder';
import { BOARD_SIZE, INITIAL_POSITION_FEN } from '../../core/constants/chess.constants';
import { GameOverDialogComponent } from './game-over-dialog/game-over-dialog.component';
import { PromotionDialogComponent } from './promotion-dialog/promotion-dialog.component';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [CommonModule, GameOverDialogComponent, PromotionDialogComponent],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
	state: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	ranks = Array.from({ length: BOARD_SIZE }, (_, i) => 7 - i);
	files = Array.from({ length: BOARD_SIZE }, (_, i) => i);
	showGameOverDialog = false;
	showPromotionDialog = false;
	pendingPromotionMoves: Move[] | null = null;
	gameMode: string | null = null;

	private moveFinder = new LegalMoveFinder();

	constructor(
		private route: ActivatedRoute
	) {
		const board = new Board();
		loadFEN(board, INITIAL_POSITION_FEN);
		this.state = new GameState(board);
	}

	ngOnInit(): void {
		this.route.paramMap.subscribe(params => {
			this.gameMode = params.get('mode');
			console.log('Gamemode : ', this.gameMode);
		});
	}

	pieceToImage(piece: any): string | null {
		if (!piece) return null;

		return `../../assets/pieces/${piece.color}-${piece.type}.png`;
	}

	onSquareClick(rank: number, file: number): void {
		const square = toIndex(rank, file);
		const piece = this.state.board.get(square);

		if (this.pendingPromotionMoves) return;

		if (this.selectedSquare === null) {
			if (!piece || piece.color !== this.state.turn) return;
			this.showLegalMoves(square);
			return;
		}

		if (piece && piece.color === this.state.turn) {
			this.showLegalMoves(square);
			return;
		}

		const movesToSquare = this.legalMoves.filter(m => m.to === square);

		if (movesToSquare.length === 0) {
			this.selectedSquare = null;
			this.legalMoves = [];
			return;
		}

		if (movesToSquare.length === 1) {
			this.state.applyMove(movesToSquare[0]);
			this.checkGameOver();
			this.selectedSquare = null;
			this.legalMoves = [];
		} else {
			this.pendingPromotionMoves = movesToSquare;
			this.showPromotionDialog = true;
		}
	}

	showLegalMoves(square: number): void {
		this.selectedSquare = square;
		this.legalMoves = this.moveFinder.getLegalMoves(
			this.state.board,
			square
		);

	}

	isLegalTarget(square: number): boolean {
		return this.legalMoves.some(m => m.to === square);
	}

	resetGame(): void {
		const board = new Board();
		loadFEN(board, INITIAL_POSITION_FEN);
		this.state = new GameState(board);
		this.selectedSquare = null;
		this.legalMoves = [];
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

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		if (!this.pendingPromotionMoves) return;
		const move = this.pendingPromotionMoves.find(m => m.promotion === pieceType);
		if (move) {
			this.state.applyMove(move);
			this.checkGameOver();
		}
		this.closePromotionDialog();
	}

	closePromotionDialog(): void {
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.selectedSquare = null;
		this.legalMoves = [];
	}

	onRestart(): void {
		this.resetGame();
	}

	onExit(): void {
		this.showGameOverDialog = false;
	}

	private checkGameOver(): void {
		if (this.state.result.type !== 'ongoing') {
			this.showGameOverDialog = true;
		}
	}
}
