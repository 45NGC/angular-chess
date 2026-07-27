import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { GameState } from '../core/rules/game-state';
import { Board } from '../core/board/board';
import { Move } from '../core/rules/move';
import { AttackedSquares } from '../core/rules/attacked-squares';
import { loadFEN } from '../core/board/fen';
import { INITIAL_POSITION_FEN } from '../core/constants/chess.constants';
import { LOW_TIME_THRESHOLD_MS } from '../core/constants/time.constants';
import { IGameService } from '../interfaces/game-service.interface';
import { SoundService } from './sound.service';
import { TimeControl } from '../interfaces/time-control.interface';
import { LocalClock, LocalClockState } from '../core/time/local-clock';
import { MoveNavigableGame } from './shared/move-navigation';

export const LOCAL_TIME_CONTROL = new InjectionToken<TimeControl>('LOCAL_TIME_CONTROL');

@Injectable()
export class LocalGameService extends MoveNavigableGame implements IGameService {
	override isPaused = false;
	private clockFrozenByHistoryNavigation = false;

	timeControl: TimeControl;
	clockEnabled = false;
	whiteTimeMs = 0;
	blackTimeMs = 0;
	activeClockColor: 'white' | 'black' | null = null;

	private clock: LocalClock | null = null;
	private pausedClockColor: 'white' | 'black' | null = null;

	constructor(
		private soundService: SoundService,
		@Optional() @Inject(LOCAL_TIME_CONTROL) timeControl?: TimeControl
	) {
		super();
		this.timeControl = timeControl ?? {
			white: { baseMinutes: 0, incrementSeconds: 0 },
			black: { baseMinutes: 0, incrementSeconds: 0 }
		};
		this.clock = new LocalClock(
			(winner) => this.onTimeout(winner),
			(clockState) => this.applyClockState(clockState)
		);
		this.resetGame();
	}

	resetGame(): void {
		const board = new Board();
		loadFEN(board, INITIAL_POSITION_FEN);
		this.state = new GameState(board);
		this.resetInteractionState();
		this.isPaused = false;
		this.pausedClockColor = null;
		this.resetNavigationState();
		this.clockFrozenByHistoryNavigation = false;
		this.resetClock();
	}

	protected override canInteractWithBoard(): boolean {
		// Board interaction is disabled once a result has been reached
		return this.state.result.type === 'ongoing' && !this.isPaused && !this.reviewOnly;
	}

	closeGameOverDialog(): void {
		this.dismissGameOverDialog();
	}

	protected override canSubmitPromotionSelection(): boolean {
		return !this.isPaused;
	}

	protected override handleIllegalMoveTarget(): void {
		this.soundService.playError();
	}

	protected override submitResolvedMove(move: Move): void {
		this.applyMove(move);
	}

	private applyMove(move: Move): void {
		const mover = this.state.turn;
		const isCapture = Boolean(this.state.board.get(move.to)) || move.enPassant === true;

		// A new move invalidates any "future" moves.
		if (this.redoHistory.length > 0) this.redoHistory = [];
		this.clockFrozenByHistoryNavigation = false;

		this.moveHistory.push(move);
		this.state.applyMove(move);
		this.clock?.switchTurn(mover);

		const isCheck = AttackedSquares.isKingInCheck(this.state.board, this.state.turn);

		if (isCheck) {
			this.soundService.playCheck();
		} else if (isCapture) {
			this.soundService.playCapture();
		} else {
			this.soundService.playMove();
		}

		this.checkGameOver();
	}

	protected override onHistoryNavigationStep(): void {
		this.clockFrozenByHistoryNavigation = true;
		this.clock?.stop();
	}

	protected override afterHistoryRebuild(): void {
		super.afterHistoryRebuild();
		if (this.state.result.type !== 'ongoing') this.clock?.stop();
	}

	private checkGameOver(): void {
		if (this.state.result.type !== 'ongoing') {
			this.soundService.playEnd();
			this.clock?.stop();
			this.markGameOverReached();
		}
	}

	override destroy(): void {
		this.clock?.stop();
	}

	pause(): void {
		if (this.isPaused) return;
		if (this.showGameOverDialog) return;
		if (this.pendingPromotionMoves || this.showPromotionDialog) return;

		this.isPaused = true;
		this.clearSelection();

		// If the clock is already frozen due to history navigation, don't capture an "active" color.
		this.pausedClockColor = this.clockFrozenByHistoryNavigation ? null : this.activeClockColor;
		this.clock?.stop();
	}

	resume(): void {
		if (!this.isPaused) return;

		this.isPaused = false;
		const active = this.pausedClockColor;
		this.pausedClockColor = null;

		if (active && this.state.result.type === 'ongoing') {
			this.clock?.start(active);
		}
	}

	private resetClock(): void {
		if (!this.clock) return;
		this.clock.configure(
			this.timeControl.white.baseMinutes,
			this.timeControl.white.incrementSeconds,
			this.timeControl.black.baseMinutes,
			this.timeControl.black.incrementSeconds
		);
		this.clockEnabled = this.timeControl.white.baseMinutes > 0 || this.timeControl.black.baseMinutes > 0;
		// Don't start counting until the first move is made.
		this.clock.stop();
	}

	private applyClockState(state: LocalClockState): void {
		const prevWhiteMs = this.whiteTimeMs;
		const prevBlackMs = this.blackTimeMs;

		this.clockEnabled = state.enabled;
		this.whiteTimeMs = state.whiteMs;
		this.blackTimeMs = state.blackMs;
		this.activeClockColor = state.active;

		const active = state.active;
		if (!active) return;

		const enabled = active === 'white' ? state.whiteEnabled : state.blackEnabled;
		if (!enabled) return;

		const prevMs = active === 'white' ? prevWhiteMs : prevBlackMs;
		const nextMs = active === 'white' ? state.whiteMs : state.blackMs;
		if (prevMs >= LOW_TIME_THRESHOLD_MS && nextMs < LOW_TIME_THRESHOLD_MS) {
			this.soundService.playLowTime();
		}
	}

	private onTimeout(winner: 'white' | 'black'): void {
		if (this.state.result.type !== 'ongoing') return;
		this.state.result = { type: 'timeout', winner };
		this.soundService.playEnd();
		this.clock?.stop();
		this.markGameOverReached();
	}
}
