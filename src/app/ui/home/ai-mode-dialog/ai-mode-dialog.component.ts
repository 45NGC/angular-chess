import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiDifficulty, AiModeSettings, PlayerColor } from '../../../interfaces/ai-mode.interface';

type DifficultyOption = { key: AiDifficulty; label: string };
type ColorOption = { key: PlayerColor; label: string };

@Component({
	selector: 'app-ai-mode-dialog',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './ai-mode-dialog.component.html',
	styleUrls: ['./ai-mode-dialog.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiModeDialogComponent {
	@Output() confirm = new EventEmitter<AiModeSettings>();
	@Output() cancel = new EventEmitter<void>();

	private _initial: AiModeSettings = { difficulty: 'beginner', playerColor: 'random' };
	@Input() set initial(value: AiModeSettings | null | undefined) {
		if (!value) return;
		this._initial = value;
		this.selectedDifficulty = value.difficulty;
		this.selectedPlayerColor = value.playerColor;
	}
	get initial(): AiModeSettings { return this._initial; }

	readonly levels: DifficultyOption[] = [
		{ key: 'beginner', label: 'Beginner (~800)' },
		{ key: 'intermediate', label: 'Intermediate (~1200)' },
		{ key: 'advanced', label: 'Advanced (~1600)' },
		{ key: 'expert', label: 'Expert (~2000)' }
	];

	readonly colors: ColorOption[] = [
		{ key: 'white', label: 'WHITE' },
		{ key: 'black', label: 'BLACK' },
		{ key: 'random', label: 'RANDOM' }
	];

	selectedDifficulty: AiDifficulty = this._initial.difficulty;
	selectedPlayerColor: PlayerColor = this._initial.playerColor;

	selectDifficulty(difficulty: AiDifficulty): void {
		this.selectedDifficulty = difficulty;
	}

	selectPlayerColor(color: PlayerColor): void {
		this.selectedPlayerColor = color;
	}

	get summary(): string {
		return `Difficulty: ${this.getDifficultyLabel(this.selectedDifficulty)} • You play: ${this.getPlayerColorLabel(this.selectedPlayerColor)}`;
	}

	private getDifficultyLabel(key: AiDifficulty): string {
		return this.levels.find(l => l.key === key)?.label ?? key;
	}

	private getPlayerColorLabel(key: PlayerColor): string {
		return this.colors.find(c => c.key === key)?.label ?? key.toUpperCase();
	}

	onConfirm(): void {
		this.confirm.emit({
			difficulty: this.selectedDifficulty,
			playerColor: this.selectedPlayerColor
		});
	}

	onCancel(): void {
		this.cancel.emit();
	}

	@HostListener('document:keydown', ['$event'])
	onDocumentKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		this.onCancel();
	}
}
