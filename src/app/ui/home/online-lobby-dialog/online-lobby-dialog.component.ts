import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { OnlineGameSettings } from '../../../interfaces/online-game-settings.interface';
import { JoinOnlineRoomError, OnlineRoom, OnlineRoomSession } from '../../../interfaces/online-room.interface';
import { TimeControl } from '../../../interfaces/time-control.interface';
import { OnlineRoomCodeService } from '../../../services/online-room-code.service';
import { OnlineConnectionState, OnlineRoomService } from '../../../services/online-room.service';
import { OnlineGameSettingsDialogComponent } from '../online-game-settings-dialog/online-game-settings-dialog.component';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

@Component({
	selector: 'app-online-lobby-dialog',
	standalone: true,
	imports: [CommonModule, OnlineGameSettingsDialogComponent],
	templateUrl: './online-lobby-dialog.component.html',
	styleUrls: ['./online-lobby-dialog.component.css']
})
export class OnlineLobbyDialogComponent implements OnDestroy {
	@Input({ required: true }) initialSettings: OnlineGameSettings = {
		timeControlSettings: {
			white: { baseMinutes: 5, incrementSeconds: 0 },
			black: { baseMinutes: 5, incrementSeconds: 0 }
		},
		hostSidePreference: 'random'
	};
	@Output() close = new EventEmitter<void>();
	@Output() settingsChange = new EventEmitter<OnlineGameSettings>();

	showOnlineGameSettingsDialog = false;
	joinCode = '';
	joinError = '';
	activeRoom: OnlineRoom | null = null;
	activeSession: OnlineRoomSession | null = null;
	activeFlow: 'created' | 'joined' | null = null;
	isSubmitting = false;
	connectionState: OnlineConnectionState = 'idle';
	connectionMessage = '';
	private roomSubscription: Subscription | null = null;
	private connectionStateSubscription: Subscription;
	private connectionMessageSubscription: Subscription;

	constructor(
		private roomCodeService: OnlineRoomCodeService,
		private onlineRoomService: OnlineRoomService,
		private router: Router,
		private cdr: ChangeDetectorRef
	) {
		this.connectionStateSubscription = this.onlineRoomService.watchConnectionState().subscribe(state => {
			this.connectionState = state;
		});
		this.connectionMessageSubscription = this.onlineRoomService.watchConnectionMessage().subscribe(message => {
			this.connectionMessage = message ?? '';
		});
	}

	ngOnDestroy(): void {
		this.roomSubscription?.unsubscribe();
		this.connectionStateSubscription.unsubscribe();
		this.connectionMessageSubscription.unsubscribe();
	}

	openCreateDialog(): void {
		this.showOnlineGameSettingsDialog = true;
	}

	onOnlineGameSettingsConfirm(settings: OnlineGameSettings): void {
		if (this.isSubmitting) return;

		this.settingsChange.emit(settings);
		this.isSubmitting = true;
		this.showOnlineGameSettingsDialog = false;
		this.onlineRoomService.createRoom(settings).subscribe({
			next: ({ room, session }) => {
				this.activeSession = session;
				this.activeFlow = 'created';
				this.setActiveRoom(room);
				this.watchRoom(room.code);
				this.joinError = '';
				this.joinCode = '';
				this.isSubmitting = false;
				this.cdr.detectChanges();
			},
			error: () => {
				this.joinError = 'Could not create the room. Check that the backend is running.';
				this.isSubmitting = false;
				this.cdr.detectChanges();
			}
		});
	}

	onOnlineGameSettingsCancel(): void {
		this.showOnlineGameSettingsDialog = false;
	}

	onJoinCodeInput(event: Event): void {
		const input = event.target as HTMLInputElement | null;
		this.joinCode = this.roomCodeService.normalizeCode(input?.value);
		this.joinError = '';
	}

	onJoinGame(): void {
		if (this.isSubmitting) return;
		if (!this.roomCodeService.isValidCode(this.joinCode)) {
			this.joinError = 'Enter a valid 6-character code.';
			this.cdr.detectChanges();
			return;
		}
		if (this.activeSession?.roomCode === this.joinCode) {
			this.joinError = 'You are already the host of this room.';
			this.cdr.detectChanges();
			return;
		}

		this.isSubmitting = true;
		this.onlineRoomService.joinRoom(this.joinCode).subscribe({
			next: result => {
				if (!result.ok) {
					this.joinError = this.getJoinErrorMessage(result.error);
					this.isSubmitting = false;
					this.cdr.detectChanges();
					return;
				}

				this.activeSession = result.session;
				this.activeFlow = 'joined';
				this.setActiveRoom(result.room);
				this.watchRoom(result.room.code);
				this.joinError = '';
				this.isSubmitting = false;
				this.cdr.detectChanges();
			},
			error: () => {
				this.joinError = 'Could not reach the backend. Check that Spring Boot is running.';
				this.isSubmitting = false;
				this.cdr.detectChanges();
			}
		});
	}

	onClose(): void {
		this.close.emit();
	}

	get activeRoomSummary(): string {
		return this.formatTimeControl(this.activeRoom?.timeControlSettings ?? this.initialSettings.timeControlSettings);
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

	get preferredHostSideLabel(): string {
		switch (this.initialSettings.hostSidePreference) {
			case 'white':
				return 'White';
			case 'black':
				return 'Black';
			default:
				return 'Random';
		}
	}

	get hasCreatedRoom(): boolean {
		return this.activeFlow === 'created' && !!this.activeRoom && !!this.activeSession;
	}

	get hasJoinedRoom(): boolean {
		return this.activeFlow === 'joined' && !!this.activeRoom && !!this.activeSession;
	}

	get showConnectionNotice(): boolean {
		return this.connectionState !== 'idle' && !!this.connectionMessage;
	}

	get connectionNoticeClass(): string {
		return this.connectionState === 'connected' ? 'notice notice--success' : 'notice notice--warning';
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
			if ((room.status === 'ready' || room.status === 'playing') && this.activeSession) {
				void this.router.navigate(['/game', 'online'], {
					queryParams: {
						code: this.activeSession.roomCode,
						playerId: this.activeSession.playerId,
						side: this.activeSession.playerSide
					}
				});
			}
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
