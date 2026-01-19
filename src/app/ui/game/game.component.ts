import { Component } from '@angular/core';
import { GameState } from '../../core/rules/game-state';
import { CommonModule } from '@angular/common';
import { loadFEN } from '../../core/board/fen';
import { Board } from '../../core/board/board';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent {
	state!: GameState;

	constructor() {
		const board = new Board();
		loadFEN(board, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
		this.state = new GameState(board);
	}

	ranks = Array.from({ length: 8 }, (_, i) => 7 - i);
	files = Array.from({ length: 8 }, (_, i) => i);

	isDarkSquare(rank: number, file: number): boolean {
		return (rank + file) % 2 === 0;
	}

	pieceToImage(piece: any): string | null {
		if (!piece) return null;

		return `../../assets/pieces/${piece.color}-${piece.type}.png`;
	}
}
