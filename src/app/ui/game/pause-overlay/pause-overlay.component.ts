import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Move } from '../../../core/rules/move';
import { formatTime } from '../../../core/time/time.utils';
import { RestartButtonComponent } from '../restart-button/restart-button.component';

@Component({
	selector: 'app-pause-overlay',
	standalone: true,
	imports: [CommonModule, RestartButtonComponent],
	templateUrl: './pause-overlay.component.html',
	styleUrls: ['./pause-overlay.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PauseOverlayComponent {
	@Input({ required: true }) turn!: 'white' | 'black';
	@Input({ required: true }) moveHistory!: Move[];
	@Input() clockEnabled = false;
	@Input() whiteTimeMs = 0;
	@Input() blackTimeMs = 0;
	@Input() whiteInfinite = false;
	@Input() blackInfinite = false;

	@Output() resume = new EventEmitter<void>();
	@Output() restart = new EventEmitter<void>();
	@Output() quit = new EventEmitter<void>();

	formatTimeDisplay(color: 'white' | 'black'): string {
		if (color === 'white' && this.whiteInfinite) return '∞';
		if (color === 'black' && this.blackInfinite) return '∞';
		return formatTime(color === 'white' ? this.whiteTimeMs : this.blackTimeMs);
	}

	formatMove(move: Move): string {
		if (move.castling === 'kingSide') return 'O-O';
		if (move.castling === 'queenSide') return 'O-O-O';
		const from = this.squareToAlgebraic(move.from);
		const to = this.squareToAlgebraic(move.to);
		const promotion = move.promotion ? `=${this.promotionToLetter(move.promotion)}` : '';
		return `${from}→${to}${promotion}`;
	}

	private squareToAlgebraic(square: number): string {
		const rank = Math.floor(square / 8);
		const file = square % 8;
		return `${'abcdefgh'[file]}${rank + 1}`;
	}

	private promotionToLetter(promotion: NonNullable<Move['promotion']>): string {
		switch (promotion) {
			case 'queen': return 'Q';
			case 'rook': return 'R';
			case 'bishop': return 'B';
			case 'knight': return 'N';
		}
	}
}