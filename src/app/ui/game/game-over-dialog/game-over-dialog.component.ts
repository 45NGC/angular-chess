import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
	selector: 'app-game-over-dialog',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './game-over-dialog.component.html',
	styleUrls: ['./game-over-dialog.component.css']
})
export class GameOverDialogComponent {

	constructor(private router: Router) { }

	@Input() message = '';
	@Output() restart = new EventEmitter<void>();
	@Output() exit = new EventEmitter<void>();

	onRestart() {
		this.restart.emit();
	}

	onExit() {
		this.exit.emit();
		this.router.navigate(['/']);
	}
}