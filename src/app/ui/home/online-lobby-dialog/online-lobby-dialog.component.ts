import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OnlineGameDraft } from '../../../interfaces/online-game-draft.interface';
import { TimeControl } from '../../../interfaces/time-control.interface';
import { OnlineRoomCodeService } from '../../../services/online-room-code.service';
import { TimeControlDialogComponent } from '../time-control-dialog/time-control-dialog.component';

@Component({
	selector: 'app-online-lobby-dialog',
	standalone: true,
	imports: [CommonModule, TimeControlDialogComponent],
	templateUrl: './online-lobby-dialog.component.html',
	styleUrls: ['./online-lobby-dialog.component.css']
})
export class OnlineLobbyDialogComponent {
	@Input() initialTimeControl: TimeControl = {
		white: { baseMinutes: 5, incrementSeconds: 0 },
		black: { baseMinutes: 5, incrementSeconds: 0 }
	};
	@Output() close = new EventEmitter<void>();
	@Output() timeControlChange = new EventEmitter<TimeControl>();

	showTimeControlDialog = false;
	createdGame: OnlineGameDraft | null = null;
	joinCode = '';
	joinError = '';
	joinReadyCode = '';

	constructor(private roomCodeService: OnlineRoomCodeService) { }

	openCreateDialog(): void {
		this.showTimeControlDialog = true;
	}

	onTimeControlConfirm(control: TimeControl): void {
		this.timeControlChange.emit(control);
		this.createdGame = {
			code: this.roomCodeService.generateCode(),
			timeControl: control,
			createdAt: Date.now()
		};
		this.showTimeControlDialog = false;
	}

	onTimeControlCancel(): void {
		this.showTimeControlDialog = false;
	}

	onJoinCodeInput(event: Event): void {
		const input = event.target as HTMLInputElement | null;
		this.joinCode = this.roomCodeService.normalizeCode(input?.value);
		this.joinError = '';
	}

	onJoinGame(): void {
		if (!this.roomCodeService.isValidCode(this.joinCode)) {
			this.joinError = 'Enter a valid 6-character code.';
			this.joinReadyCode = '';
			return;
		}

		this.joinReadyCode = this.joinCode;
	}

	onClose(): void {
		this.close.emit();
	}

	get createdSummary(): string {
		return this.formatTimeControl(this.createdGame?.timeControl ?? this.initialTimeControl);
	}

	private formatTimeControl(control: TimeControl): string {
		const whiteBase = control.white.baseMinutes === 0 ? 'Unlimited' : `${control.white.baseMinutes} min`;
		const blackBase = control.black.baseMinutes === 0 ? 'Unlimited' : `${control.black.baseMinutes} min`;
		return `White: ${whiteBase} +${control.white.incrementSeconds}s | Black: ${blackBase} +${control.black.incrementSeconds}s`;
	}
}
