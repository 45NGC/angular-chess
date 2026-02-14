import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-game-over-dialog',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './game-over-dialog.component.html',
	styleUrls: ['./game-over-dialog.component.css']
})
export class GameOverDialogComponent {
	@Input() message = '';
	@Output() restart = new EventEmitter<void>();
	@Output() exit = new EventEmitter<void>();

	onRestart() {
		this.restart.emit();
	}

	onExit() {
		this.exit.emit();
	}
}