import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { JoinOnlineRoomError, OnlineRoom, OnlineRoomSession } from '../../../interfaces/online-room.interface';
import { TimeControl } from '../../../interfaces/time-control.interface';
import { OnlineRoomCodeService } from '../../../services/online-room-code.service';
import { OnlineRoomService } from '../../../services/online-room.service';
import { TimeControlSettingsDialogComponent } from '../time-control-settings-dialog/time-control-settings-dialog.component';

@Component({
	selector: 'app-online-lobby-dialog',
	standalone: true,
	imports: [CommonModule, TimeControlSettingsDialogComponent],
	templateUrl: './online-lobby-dialog.component.html',
	styleUrls: ['./online-lobby-dialog.component.css']
})
export class OnlineLobbyDialogComponent implements OnDestroy {
	@Input({ required: true }) initialTimeControl: TimeControl = {
		white: { baseMinutes: 5, incrementSeconds: 0 },
		black: { baseMinutes: 5, incrementSeconds: 0 }
	};
	@Output() close = new EventEmitter<void>();
	@Output() timeControlChange = new EventEmitter<TimeControl>();

	showTimeControlDialog = false;
	joinCode = '';
	joinError = '';
	activeRoom: OnlineRoom | null = null;
	activeSession: OnlineRoomSession | null = null;
	activeFlow: 'created' | 'joined' | null = null;
	private roomSubscription: Subscription | null = null;

	constructor(
		private roomCodeService: OnlineRoomCodeService,
		private onlineRoomService: OnlineRoomService
	) { }

	ngOnDestroy(): void {
		this.roomSubscription?.unsubscribe();
	}

	openCreateDialog(): void {
		this.showTimeControlDialog = true;
	}

	onTimeControlConfirm(settings: TimeControl): void {
		this.timeControlChange.emit(settings);
		const { room, session } = this.onlineRoomService.createRoom(settings);
		this.activeSession = session;
		this.activeFlow = 'created';
		this.setActiveRoom(room);
		this.watchRoom(room.code);
		this.joinError = '';
		this.joinCode = '';
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
			return;
		}

		const result = this.onlineRoomService.joinRoom(this.joinCode);
		if (!result.ok) {
			this.joinError = this.getJoinErrorMessage(result.error);
			return;
		}

		this.activeSession = result.session;
		this.activeFlow = 'joined';
		this.setActiveRoom(result.room);
		this.watchRoom(result.room.code);
		this.joinError = '';
	}

	onClose(): void {
		this.close.emit();
	}

	get activeRoomSummary(): string {
		return this.formatTimeControl(this.activeRoom?.timeControlSettings ?? this.initialTimeControl);
	}

	get activeStatusLabel(): string {
		switch (this.activeRoom?.status) {
			case 'waiting':
				return 'Waiting for opponent';
			case 'ready':
				return 'Room ready';
			case 'playing':
				return 'Game in progress';
			case 'finished':
				return 'Game finished';
			default:
				return '';
		}
	}

	get activeSideLabel(): string {
		return this.activeSession?.playerSide === 'white' ? 'White' : this.activeSession?.playerSide === 'black' ? 'Black' : '';
	}

	get hasCreatedRoom(): boolean {
		return this.activeFlow === 'created' && !!this.activeRoom && !!this.activeSession;
	}

	get hasJoinedRoom(): boolean {
		return this.activeFlow === 'joined' && !!this.activeRoom && !!this.activeSession;
	}

	private formatTimeControl(control: TimeControl): string {
		const whiteBase = control.white.baseMinutes === 0 ? 'Unlimited' : `${control.white.baseMinutes} min`;
		const blackBase = control.black.baseMinutes === 0 ? 'Unlimited' : `${control.black.baseMinutes} min`;
		return `White: ${whiteBase} +${control.white.incrementSeconds}s | Black: ${blackBase} +${control.black.incrementSeconds}s`;
	}

	private watchRoom(code: string): void {
		this.roomSubscription?.unsubscribe();
		this.roomSubscription = this.onlineRoomService.watchRoom(code).subscribe(room => {
			if (!room) return;
			this.setActiveRoom(room);
		});
	}

	private setActiveRoom(room: OnlineRoom): void {
		this.activeRoom = room;
	}

	private getJoinErrorMessage(error: JoinOnlineRoomError): string {
		switch (error) {
			case 'notFound':
				return 'Room not found.';
			case 'full':
				return 'This room is already full.';
			case 'finished':
				return 'This room has already finished.';
		}
	}
}
