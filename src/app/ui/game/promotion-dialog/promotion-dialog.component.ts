import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PieceColor } from '../../../core/board/piece';

@Component({
	selector: 'app-promotion-dialog',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './promotion-dialog.component.html',
	styleUrls: ['./promotion-dialog.component.css']
})
export class PromotionDialogComponent {
	@Input() color: PieceColor = 'white';
	@Output() selected = new EventEmitter<'queen' | 'rook' | 'bishop' | 'knight'>();
	@Output() close = new EventEmitter<void>();

	pieceTypes = ['queen', 'rook', 'bishop', 'knight'] as const;

	getPieceImage(type: string): string {
		return `assets/pieces/${this.color}-${type}.png`;
	}

	onSelect(type: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		this.selected.emit(type);
	}

	onClose(): void {
		this.close.emit();
	}
}