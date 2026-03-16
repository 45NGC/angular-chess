import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { GameState } from '../core/rules/game-state';
import { Board, toIndex } from '../core/board/board';
import { Move } from '../core/rules/move';
import { AttackedSquares } from '../core/rules/attacked-squares';
import { LegalMoveFinder } from '../core/rules/legal-move-finder';
import { loadFEN } from '../core/board/fen';
import { INITIAL_POSITION_FEN } from '../core/constants/chess.constants';
import { IGameService } from '../interfaces/game-service.interface';
import { SoundService } from './sound.service';
import { TimeControl } from '../interfaces/time-control.interface';
import { LocalClock, LocalClockState } from './local-clock';

export const LOCAL_TIME_CONTROL = new InjectionToken<TimeControl>('LOCAL_TIME_CONTROL');

@Injectable()
export class LocalGameService implements IGameService {
	state!: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	showGameOverDialog = false;
	showPromotionDialog = false;
	pendingPromotionMoves: Move[] | null = null;

	timeControl: TimeControl;
	clockEnabled = false;
	whiteTimeMs = 0;
	blackTimeMs = 0;
	activeClockColor: 'white' | 'black' | null = null;

	private moveFinder = new LegalMoveFinder();
	private clock: LocalClock | null = null;

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
		this.resetClock();
	}

	handleSquareClick(rank: number, file: number): void {
		if (this.state.result.type !== 'ongoing') return;
		const square = toIndex(rank, file);
		const piece = this.state.board.get(square);

		// If a promotion is pending ignore any board clicks
		if (this.pendingPromotionMoves) return;

		// No piece selected yet, only show piece moves if it belongs to the current player
		if (this.selectedSquare === null) {
			if (!piece || piece.color !== this.state.turn) return;
			this.showLegalMoves(square);
			return;
		}

		// A piece is already selected, and the click is on another piece of the same color
		if (piece && piece.color === this.state.turn) {
			this.showLegalMoves(square);
			return;
		}

		// At this point, the click is on an empty square or an opponent's piece.
		// Filter legal moves that end on this square
		const movesToSquare = this.legalMoves.filter(m => m.to === square);

		// If no legal move ends here, cancel the selection
		if (movesToSquare.length === 0) {
			this.selectedSquare = null;
			this.legalMoves = [];
			return;
		}

		if (movesToSquare.length === 1) {
			// Normal move or promotion with a single choice selected by the player
			this.applyMoveAndCheckGameOver(movesToSquare[0]);
			this.selectedSquare = null;
			this.legalMoves = [];
		} else {
			// Multiple promotion choices, open the promotion dialog for 
			// the player to select the promotion
			this.pendingPromotionMoves = movesToSquare;
			this.showPromotionDialog = true;
		}
	}

	private showLegalMoves(square: number): void {
		this.selectedSquare = square;
		this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, square);
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
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
		this.selectedSquare = null;
		this.legalMoves = [];
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
		const capturedPiece = this.state.board.get(move.to);

		this.state.applyMove(move);

		this.clock?.switchTurn(mover);

		// Check if the king is in check to play the check sound
		const kingSquare = this.state.board.findKing(this.state.turn);
		const attackerColor = this.state.turn === 'white' ? 'black' : 'white';
		if (AttackedSquares.isSquareAttacked(this.state.board, kingSquare, attackerColor)) {
			this.soundService.playCheck();
		} else {

			if (capturedPiece) {
				this.soundService.playCapture();
			} else {
				this.soundService.playMove();
			}

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

	private resetClock(): void {
		if (!this.clock) return;
		this.clock.configure(
			this.timeControl.white.baseMinutes,
			this.timeControl.white.incrementSeconds,
			this.timeControl.black.baseMinutes,
			this.timeControl.black.incrementSeconds
		);
		this.clockEnabled = this.timeControl.white.baseMinutes > 0 || this.timeControl.black.baseMinutes > 0;
		if (this.clockEnabled) {
			this.clock.start('white');
		} else {
			this.clock.stop();
		}
	}

	private applyClockState(snap: LocalClockState): void {
		this.clockEnabled = snap.enabled;
		this.whiteTimeMs = snap.whiteMs;
		this.blackTimeMs = snap.blackMs;
		this.activeClockColor = snap.active;
	}

	private onTimeout(winner: 'white' | 'black'): void {
		if (this.state.result.type !== 'ongoing') return;
		this.state.result = { type: 'timeout', winner };
		this.soundService.playEnd();
		this.showGameOverDialog = true;
	}
}
