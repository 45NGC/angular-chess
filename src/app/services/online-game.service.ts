import { GameState } from '../core/rules/game-state';
import { Move } from '../core/rules/move';
import { AttackedSquares } from '../core/rules/attacked-squares';
import { IGameService } from '../interfaces/game-service.interface';
import {
	OnlineRoom,
	OnlineRoomSession,
	OnlineRoomSide,
	RequestOnlineRematchError,
	SubmitOnlineMoveError
} from '../interfaces/online-room.interface';
import { TimeControl } from '../interfaces/time-control.interface';
import { OnlineRoomService } from './online-room.service';
import { SoundService } from './sound.service';
import { Subscription } from 'rxjs';
import { buildGameStateFromMoves } from '../core/rules/move-history';
import { GameplayService } from './shared/gameplay-base';

export class OnlineGameService extends GameplayService implements IGameService {
	moveHistory: Move[] = [];

	timeControl: TimeControl;
	lastSubmissionError: string | null = null;
	isRequestingRematch = false;

	private readonly roomSubscription: Subscription;
	private room: OnlineRoom | null = null;
	private currentPlayerSide: OnlineRoomSide;
	private baseWhiteTimeMs = 0;
	private baseBlackTimeMs = 0;
	private baseActiveClockColor: 'white' | 'black' | null = null;
	private clockUpdatedAt: number | null = null;

	constructor(
		private soundService: SoundService,
		private onlineRoomService: OnlineRoomService,
		private session: OnlineRoomSession,
		private requestRenderCallback: (() => void) | null = null
	) {
		super();
		this.currentPlayerSide = session.playerSide;
		const initialRoom = this.onlineRoomService.getRoom(session.roomCode);
		this.timeControl = initialRoom?.timeControlSettings ?? {
			white: { baseMinutes: 0, incrementSeconds: 0 },
			black: { baseMinutes: 0, incrementSeconds: 0 }
		};
		this.state = buildGameStateFromMoves([]);
		this.roomSubscription = this.onlineRoomService.watchRoom(session.roomCode).subscribe(room => {
			if (!room) return;
			this.applyRoom(room);
		});
	}

	get clockEnabled(): boolean {
		return this.timeControl.white.baseMinutes > 0 || this.timeControl.black.baseMinutes > 0;
	}

	get whiteTimeMs(): number {
		return this.getDisplayedTime('white');
	}

	get blackTimeMs(): number {
		return this.getDisplayedTime('black');
	}

	get activeClockColor(): 'white' | 'black' | null {
		return this.baseActiveClockColor;
	}

	get playerSide(): OnlineRoomSide {
		return this.currentPlayerSide;
	}

	get hasRequestedRematch(): boolean {
		if (!this.room) {
			return false;
		}
		return this.playerSide === 'white'
			? this.room.whiteRequestedRematch
			: this.room.blackRequestedRematch;
	}

	get opponentRequestedRematch(): boolean {
		if (!this.room) {
			return false;
		}
		return this.playerSide === 'white'
			? this.room.blackRequestedRematch
			: this.room.whiteRequestedRematch;
	}

	get rematchStatusMessage(): string {
		if (this.room?.status !== 'finished') {
			return '';
		}
		if (this.isRequestingRematch) {
			return 'Sending rematch request...';
		}
		if (this.hasRequestedRematch && !this.opponentRequestedRematch) {
			return 'Waiting for your opponent...';
		}
		if (!this.hasRequestedRematch && this.opponentRequestedRematch) {
			return 'Your opponent requested a rematch.';
		}
		return '';
	}

	get rematchActionLabel(): string {
		if (this.isRequestingRematch) {
			return 'SENDING...';
		}
		if (this.hasRequestedRematch) {
			return 'REMATCH REQUESTED';
		}
		if (this.opponentRequestedRematch) {
			return 'ACCEPT REMATCH';
		}
		return 'REQUEST REMATCH';
	}

	get rematchActionDisabled(): boolean {
		return this.isRequestingRematch || !this.canRequestRematch();
	}

	resetGame(): void {
		if (!this.canRequestRematch()) {
			return;
		}

		this.isRequestingRematch = true;
		this.lastSubmissionError = null;
		this.requestRender();

		this.onlineRoomService.requestRematch(this.session.roomCode, this.session.playerId).subscribe({
			next: result => {
				this.isRequestingRematch = false;
				if (!result.ok) {
					this.lastSubmissionError = this.getRematchErrorMessage(result.error);
					this.soundService.playError();
					this.requestRender();
					return;
				}
				this.lastSubmissionError = null;
				this.requestRender();
			},
			error: () => {
				this.isRequestingRematch = false;
				this.lastSubmissionError = 'Could not send the rematch request to the server.';
				this.soundService.playError();
				this.requestRender();
			}
		});
	}

	closeGameOverDialog(): void {
		this.showGameOverDialog = false;
	}

	destroy(): void {
		this.roomSubscription.unsubscribe();
	}

	protected override canInteractWithBoard(): boolean {
		if (this.room?.status !== 'ready' && this.room?.status !== 'playing') return false;
		if (this.state.result.type !== 'ongoing') return false;
		if (this.baseActiveClockColor === this.playerSide && this.getDisplayedTime(this.playerSide) <= 0) return false;
		return this.state.turn === this.playerSide;
	}

	protected override handleIllegalMoveTarget(): void {
		this.soundService.playError();
	}

	protected override submitResolvedMove(move: Move): void {
		this.submitMove(move);
	}

	protected override getTimeoutWinnerOverride(): 'white' | 'black' | null {
		return this.room?.timeoutWinner ?? null;
	}

	private submitMove(move: Move): void {
		this.onlineRoomService.submitMove(this.session.roomCode, this.session.playerId, move).subscribe({
			next: result => {
				if (!result.ok) {
					this.lastSubmissionError = this.getMoveErrorMessage(result.error);
					this.soundService.playError();
					this.requestRender();
					return;
				}
				this.lastSubmissionError = null;
				this.clearSelection();
				this.requestRender();
			},
			error: () => {
				this.lastSubmissionError = 'Could not send the move to the server.';
				this.soundService.playError();
				this.requestRender();
			}
		});
	}

	private applyRoom(room: OnlineRoom): void {
		const previousState = this.state;
		const previousMoveCount = this.moveHistory.length;
		const previousPlayerSide = this.currentPlayerSide;

		this.room = room;
		this.isRequestingRematch = false;
		this.lastSubmissionError = null;
		this.currentPlayerSide = this.findPlayerSide(room) ?? this.currentPlayerSide;
		this.timeControl = room.timeControlSettings;
		this.baseWhiteTimeMs = room.whiteTimeMs;
		this.baseBlackTimeMs = room.blackTimeMs;
		this.baseActiveClockColor = room.activeClockColor;
		this.clockUpdatedAt = room.clockUpdatedAt;
		this.moveHistory = room.moves.map(entry => entry.move);
		this.state = buildGameStateFromMoves(this.moveHistory);

		const playerSideChanged = this.currentPlayerSide !== previousPlayerSide;
		const gameRestarted = this.moveHistory.length < previousMoveCount
			|| (previousState.result.type !== 'ongoing' && this.state.result.type === 'ongoing');

		if (playerSideChanged || gameRestarted) {
			this.clearSelection();
			this.pendingPromotionMoves = null;
			this.showPromotionDialog = false;
		}

		if (this.selectedSquare !== null) {
			const selectedPiece = this.state.board.get(this.selectedSquare);
			if (!selectedPiece || selectedPiece.color !== this.state.turn || selectedPiece.color !== this.playerSide) {
				this.clearSelection();
			} else {
				this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, this.selectedSquare);
			}
		}

		if (this.pendingPromotionMoves && this.state.turn !== this.playerSide) {
			this.closePromotionDialog();
		}

		this.showGameOverDialog = room.status === 'finished' || this.state.result.type !== 'ongoing';

		if (this.moveHistory.length > previousMoveCount) {
			const latestMove = this.moveHistory[this.moveHistory.length - 1];
			const wasCapture = Boolean(previousState.board.get(latestMove.to)) || latestMove.enPassant === true;
			const isCheck = AttackedSquares.isKingInCheck(this.state.board, this.state.turn);
			if (this.state.result.type !== 'ongoing') {
				this.soundService.playEnd();
			} else if (isCheck) {
				this.soundService.playCheck();
			} else if (wasCapture) {
				this.soundService.playCapture();
			} else {
				this.soundService.playMove();
			}
		}

		this.requestRender();
	}

	protected override requestRender(): void {
		this.requestRenderCallback?.();
	}

	private canRequestRematch(): boolean {
		return this.room?.status === 'finished' && !this.hasRequestedRematch;
	}

	private findPlayerSide(room: OnlineRoom): OnlineRoomSide | null {
		if (room.whitePlayer?.id === this.session.playerId) {
			return 'white';
		}
		if (room.blackPlayer?.id === this.session.playerId) {
			return 'black';
		}
		return null;
	}

	private getMoveErrorMessage(error: SubmitOnlineMoveError): string {
		switch (error) {
			case 'notFound':
				return 'The room no longer exists.';
			case 'notParticipant':
				return 'This session is not part of the room.';
			case 'illegalMove':
				return 'That move is not legal.';
			case 'notYourTurn':
				return 'It is not your turn.';
			case 'finished':
				return 'The game has already finished.';
		}

		return 'The move could not be processed.';
	}

	private getRematchErrorMessage(error: RequestOnlineRematchError): string {
		switch (error) {
			case 'notFound':
				return 'The room no longer exists.';
			case 'notParticipant':
				return 'This session is not part of the room.';
			case 'notFinished':
				return 'The current game is still in progress.';
		}

		return 'The rematch request could not be processed.';
	}

	private getDisplayedTime(color: 'white' | 'black'): number {
		const baseTimeMs = color === 'white' ? this.baseWhiteTimeMs : this.baseBlackTimeMs;
		if (this.baseActiveClockColor !== color || this.clockUpdatedAt == null || this.room?.status !== 'playing') {
			return baseTimeMs;
		}
		if ((color === 'white' ? this.timeControl.white.baseMinutes : this.timeControl.black.baseMinutes) <= 0) {
			return baseTimeMs;
		}

		const elapsed = Math.max(0, Date.now() - this.clockUpdatedAt);
		return Math.max(0, baseTimeMs - elapsed);
	}
}
