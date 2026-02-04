import { Component } from '@angular/core';
import { GameState } from '../../core/rules/game-state';
import { CommonModule } from '@angular/common';
import { loadFEN } from '../../core/board/fen';
import { Board, toIndex } from '../../core/board/board';
import { Move } from '../../core/rules/move';
import { LegalMoveFinder } from '../../core/rules/legal-move-finder';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent {
	state: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	ranks = Array.from({ length: 8 }, (_, i) => 7 - i);
	files = Array.from({ length: 8 }, (_, i) => i);
	showGameOverModal = false;

	private moveFinder = new LegalMoveFinder();

	constructor() {
		const board = new Board();
		loadFEN(board, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
		this.state = new GameState(board);
	}

	pieceToImage(piece: any): string | null {
		if (!piece) return null;

		return `../../assets/pieces/${piece.color}-${piece.type}.png`;
	}

	onSquareClick(rank: number, file: number): void {
		const square = toIndex(rank, file);
		const piece = this.state.board.get(square);

		if (this.selectedSquare === null) {
			if (!piece || piece.color !== this.state.turn) return;
			this.showLegalMoves(square);
			return;
		}

		if (piece && piece.color === this.state.turn) {
			this.showLegalMoves(square);
			return;
		}

		const move = this.legalMoves.find(m => m.to === square);

		if (move) {
			this.state.applyMove(move);
			this.checkGameOver();
		}

		this.selectedSquare = null;
		this.legalMoves = [];
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

	private checkGameOver(): void {
		if (this.state.result.type !== 'ongoing') {
			this.showGameOverModal = true;
		}
	}

	resetGame(): void {
		const board = new Board();
		loadFEN(board, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
		this.state = new GameState(board);
		this.selectedSquare = null;
		this.legalMoves = [];
		this.showGameOverModal = false;
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

	closeModal(): void {
		this.showGameOverModal = false;
	}
}
