import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestartButtonComponent } from '../restart-button/restart-button.component';

@Component({
	selector: 'app-game-over-dialog',
	standalone: true,
	imports: [CommonModule, RestartButtonComponent],
	templateUrl: './game-over-dialog.component.html',
	styleUrls: ['./game-over-dialog.component.css']
})
export class GameOverDialogComponent {
	@Input() message = '';
	@Input() statusMessage = '';
	@Input() restartLabel = 'REMATCH';
	@Input() restartDisabled = false;
	@Output() restart = new EventEmitter<void>();
	@Output() close = new EventEmitter<void>();
	@Output() exit = new EventEmitter<void>();

	onClose() {
		this.close.emit();
	}

	onExit() {
		this.exit.emit();
	}
}
