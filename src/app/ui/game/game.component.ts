import { Component } from '@angular/core';
import { GameState } from '../../core/rules/game-state';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent {
	state = new GameState();

	ranks = Array.from({ length: 8 }, (_, i) => 7 - i);
	files = Array.from({ length: 8 }, (_, i) => i);

	isLightSquare(rank: number, file: number): boolean {
		return (rank + file) % 2 === 0;
	}
}
