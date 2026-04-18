import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { GameState } from '../core/rules/game-state';
import { Board, toIndex } from '../core/board/board';
import { Move } from '../core/rules/move';
import { AttackedSquares } from '../core/rules/attacked-squares';
import { LegalMoveFinder } from '../core/rules/legal-move-finder';
import { loadFEN } from '../core/board/fen';
import { INITIAL_POSITION_FEN } from '../core/constants/chess.constants';
import { LOW_TIME_THRESHOLD_MS } from '../core/constants/time.constants';
import { IGameService } from '../interfaces/game-service.interface';
import { SoundService } from './sound.service';
import { TimeControl } from '../interfaces/time-control.interface';
import { LocalClock, LocalClockState } from '../core/time/local-clock';

export const LOCAL_TIME_CONTROL = new InjectionToken<TimeControl>('LOCAL_TIME_CONTROL');

@Injectable()
export class LocalGameService implements IGameService {
	state!: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	showGameOverDialog = false;
	showPromotionDialog = false;
	pendingPromotionMoves: Move[] | null = null;

	isPaused = false;
	moveHistory: Move[] = [];

	timeControl: TimeControl;
	clockEnabled = false;
	whiteTimeMs = 0;
	blackTimeMs = 0;
	activeClockColor: 'white' | 'black' | null = null;

	private moveFinder = new LegalMoveFinder();
	private clock: LocalClock | null = null;
	private pausedClockColor: 'white' | 'black' | null = null;

	constructor(
		private soundService: SoundService,
		@Optional() @Inject(LOCAL_TIME_CONTROL) timeControl?: TimeControl
	) {
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
		this.selectedSquare = null;
		this.legalMoves = [];
		this.showGameOverDialog = false;
		this.showPromotionDialog = false;
		this.pendingPromotionMoves = null;
		this.isPaused = false;
		this.pausedClockColor = null;
		this.moveHistory = [];
		this.resetClock();
	}

	handleSquareClick(rank: number, file: number): void {
		// Ignore clicks when the game is over or when the promotion dialog is awaiting a choice
		if (!this.canInteractWithBoard()) return;
		if (this.pendingPromotionMoves) return;

		const square = toIndex(rank, file);
		const piece = this.state.board.get(square);

		// First click: select a piece (only if it belongs to the side to move) and show its legal moves
		if (this.selectedSquare === null) {
			this.trySelectSquare(piece, square);
			return;
		}

		// If a piece is already selected and the player clicks another own piece, just change selection
		if (this.isCurrentPlayerPiece(piece)) {
			this.showLegalMoves(square);
			return;
		}

		// Otherwise, try to play one of the currently highlighted legal moves to the clicked square
		this.tryMoveToSquare(square);
	}

	private canInteractWithBoard(): boolean {
		// Board interaction is disabled once a result has been reached
		return this.state.result.type === 'ongoing' && !this.isPaused;
	}

	private isCurrentPlayerPiece(piece: ReturnType<Board['get']>): boolean {
		// Convenience helper for "piece exists and belongs to the side to move"
		return piece != null && piece.color === this.state.turn;
	}

	private trySelectSquare(piece: ReturnType<Board['get']>, square: number): void {
		// Only allow selecting a piece of the side to move
		if (!this.isCurrentPlayerPiece(piece)) return;
		this.showLegalMoves(square);
	}

	clearSelection(): void {
		// Clear UI selection and any cached legal moves
		this.selectedSquare = null;
		this.legalMoves = [];
	}

	private tryMoveToSquare(square: number): void {
		// Filter current legal moves to the destination square
		const movesToSquare = this.legalMoves.filter(m => m.to === square);
		if (movesToSquare.length === 0) {
			// Clicking an unrelated square cancels the current selection
			this.clearSelection();
			return;
		}

		if (movesToSquare.length === 1) {
			// Single legal move: execute immediately.
			this.applyMoveAndCheckGameOver(movesToSquare[0]);
			this.clearSelection();
			return;
		}

		// Multiple moves mean promotion choices: open the promotion dialog
		this.pendingPromotionMoves = movesToSquare;
		this.showPromotionDialog = true;
	}

	private showLegalMoves(square: number): void {
		this.selectedSquare = square;
		this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, square);
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		if (this.isPaused) return;
		if (!this.pendingPromotionMoves) return;
		const move = this.pendingPromotionMoves.find(m => m.promotion === pieceType);
		if (move) {
			this.applyMoveAndCheckGameOver(move);
		}
		this.closePromotionDialog();
	}

	closePromotionDialog(): void {
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.clearSelection();
	}

	closeGameOverDialog(): void {
		this.showGameOverDialog = false;
	}

	getResultMessage(): string {
		const result = this.state.result;
		switch (result.type) {
			case 'checkmate':
				return `${result.winner === 'white' ? 'WHITE' : 'BLACK'} WON`;
			case 'stalemate':
				return 'STALEMATE';
			case 'timeout':
				return `${result.winner === 'white' ? 'WHITE' : 'BLACK'} WON ON TIME`;
			default:
				return '';
		}
	}

	private applyMoveAndCheckGameOver(move: Move): void {
		const mover = this.state.turn;
		const isCapture = Boolean(this.state.board.get(move.to)) || move.enPassant === true;

		this.moveHistory.push(move);
		this.state.applyMove(move);
		this.clock?.switchTurn(mover);

		const kingSquare = this.state.board.findKing(this.state.turn);
		const attackerColor = this.state.turn === 'white' ? 'black' : 'white';

		const isCheck = AttackedSquares.isSquareAttacked(
			this.state.board,
			kingSquare,
			attackerColor
		);

		if (isCheck) {
			this.soundService.playCheck();
		} else if (isCapture) {
			this.soundService.playCapture();
		} else {
			this.soundService.playMove();
		}

		this.checkGameOver();
	}

	private checkGameOver(): void {
		if (this.state.result.type !== 'ongoing') {
			this.soundService.playEnd();
			this.clock?.stop();
			this.showGameOverDialog = true;
		}
	}

	destroy(): void {
		this.clock?.stop();
	}

	pause(): void {
		if (this.isPaused) return;
		if (this.showGameOverDialog) return;
		if (this.pendingPromotionMoves || this.showPromotionDialog) return;

		this.isPaused = true;
		this.clearSelection();

		this.pausedClockColor = this.activeClockColor;
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
		this.showGameOverDialog = true;
	}
}
