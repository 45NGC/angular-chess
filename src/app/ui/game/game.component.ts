import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { GameOverDialogComponent } from './game-over-dialog/game-over-dialog.component';
import { PromotionDialogComponent } from './promotion-dialog/promotion-dialog.component';
import { ClockComponent } from './clock/clock.component';
import { PauseButtonComponent } from './pause-button/pause-button.component';
import { PauseOverlayComponent } from './pause-overlay/pause-overlay.component';
import { BOARD_SIZE } from '../../core/constants/chess.constants';
import { fromIndex } from '../../core/board/board';
import { IGameService } from '../../interfaces/game-service.interface';
import { TimeControl } from '../../interfaces/time-control.interface';
import { LocalGameService } from '../../services/local-game.service';
import { SoundService } from '../../services/sound.service';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [
		CommonModule,
		GameOverDialogComponent,
		PromotionDialogComponent,
		ClockComponent,
		PauseButtonComponent,
		PauseOverlayComponent,
	],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
	ranks = Array.from({ length: BOARD_SIZE }, (_, i) => 7 - i);
	files = Array.from({ length: BOARD_SIZE }, (_, i) => i);

	gameService: IGameService | null = null;

	get state() { return this.gameService?.state; }
	get selectedSquare() { return this.gameService?.selectedSquare ?? null; }
	get legalMoves() { return this.gameService?.legalMoves ?? []; }
	get showGameOverDialog() { return this.gameService?.showGameOverDialog ?? false; }
	get showPromotionDialog() { return this.gameService?.showPromotionDialog ?? false; }
	get pendingPromotionMoves() { return this.gameService?.pendingPromotionMoves ?? null; }
	get clockEnabled() { return this.gameService?.clockEnabled ?? false; }
	get whiteTimeMs() { return this.gameService?.whiteTimeMs ?? 0; }
	get blackTimeMs() { return this.gameService?.blackTimeMs ?? 0; }
	get activeClockColor() { return this.gameService?.activeClockColor ?? null; }
	get timeControl() { return this.gameService?.timeControl ?? null; }
	get whiteIncrementSeconds() { return this.timeControl?.white.incrementSeconds ?? 0; }
	get blackIncrementSeconds() { return this.timeControl?.black.incrementSeconds ?? 0; }
	get isPaused() { return this.gameService?.isPaused ?? false; }
	get moveHistory() { return this.gameService?.moveHistory ?? []; }
	get pauseSupported() {
		return typeof this.gameService?.pause === 'function' && typeof this.gameService?.resume === 'function';
	}
	get pauseDisabled() {
		return !this.pauseSupported || this.showGameOverDialog || this.showPromotionDialog || !!this.pendingPromotionMoves;
	}

	get whiteInfinite(): boolean {
		return (this.timeControl?.white.baseMinutes ?? 0) === 0;
	}
	get blackInfinite(): boolean {
		return (this.timeControl?.black.baseMinutes ?? 0) === 0;
	}

	private clockUiIntervalId: number | null = null;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private soundService: SoundService,
		private cdr: ChangeDetectorRef
	) { }

	ngOnInit(): void {
		combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
			const mode = params.get('mode');
			const timeControl = this.parseTimeControl(
				query.get('baseW'),
				query.get('incW'),
				query.get('baseB'),
				query.get('incB')
			);
			this.selectService(mode, timeControl);
		});

		this.clockUiIntervalId = window.setInterval(() => {
			if (!this.clockEnabled || this.isPaused) return;
			this.cdr.detectChanges();
		}, 100);
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent): void {
		if (!this.gameService) return;
		if (!this.isClickInsideGameArea(event.target)) {
			this.handleClickOutside();
		}
	}

	private isClickInsideGameArea(target: EventTarget | null): boolean {
		if (!target || !(target instanceof HTMLElement)) return false;
		return !!target.closest('.board, app-chess-clock, .promotion-side-panel, app-game-over-dialog, app-pause-overlay');
	}

	private handleClickOutside(): void {
		if (this.gameService?.selectedSquare !== null) {
			this.gameService?.clearSelection();
		}
	}

	onSquareClick(rank: number, file: number): void {
		this.gameService?.handleSquareClick(rank, file);
	}

	private parseSide(baseMinutesRaw: string | null, incrementSecondsRaw: string | null): { baseMinutes: number; incrementSeconds: number } {
		const baseMinutes = Number(baseMinutesRaw ?? '0');
		const incrementSeconds = Number(incrementSecondsRaw ?? '0');
		return {
			baseMinutes: Number.isFinite(baseMinutes) && baseMinutes > 0 ? Math.floor(baseMinutes) : 0,
			incrementSeconds: Number.isFinite(incrementSeconds) && incrementSeconds > 0 ? Math.floor(incrementSeconds) : 0
		};
	}

	private parseTimeControl(baseW: string | null, incW: string | null, baseB: string | null, incB: string | null): TimeControl {
		return {
			white: this.parseSide(baseW, incW),
			black: this.parseSide(baseB, incB)
		};
	}

	private selectService(mode: string | null, timeControl: TimeControl): void {
		this.gameService?.destroy?.();
		switch (mode) {
			case 'local':
				this.gameService = new LocalGameService(this.soundService, timeControl);
				break;
			default:
				console.error('Modo de juego no soportado:', mode);
				this.gameService = null;
		}
	}

	pieceToImage(piece: any): string | null {
		if (!piece) return null;
		return `../../assets/pieces/${piece.color}-${piece.type}.png`;
	}

	isLegalTarget(square: number): boolean {
		return this.legalMoves.some(m => m.to === square);
	}

	private isSquareCaptureDestination(square: number): boolean {
		const board = this.state?.board;
		if (!board) return false;
		return this.legalMoves.some(m => {
			if (m.to !== square) return false;
			if (m.enPassant) return true;
			return board.get(square) !== null;
		});
	}

	isCaptureSquare(square: number): boolean {
		return this.isSquareCaptureDestination(square);
	}

	isNonCaptureLegalSquare(square: number): boolean {
		if (!this.isLegalTarget(square)) return false;
		return !this.isSquareCaptureDestination(square);
	}

	resetGame(): void {
		this.gameService?.resetGame();
	}

	getResultMessage(): string {
		return this.gameService?.getResultMessage() ?? '';
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		this.gameService?.onPromotionSelected(pieceType);
	}

	closePromotionDialog(): void {
		this.gameService?.closePromotionDialog();
	}

	onRestart(): void {
		this.resetGame();
	}

	onExit(): void {
		this.gameService?.closeGameOverDialog();
	}

	togglePause(): void {
		if (this.pauseDisabled) return;
		if (this.isPaused) {
			this.gameService?.resume?.();
			return;
		}
		this.gameService?.pause?.();
	}

	resumeFromPause(): void {
		if (!this.isPaused) return;
		this.gameService?.resume?.();
	}

	quitToHome(): void {
		this.router.navigate(['/']);
	}

	ngOnDestroy(): void {
		this.gameService?.destroy?.();
		if (this.clockUiIntervalId !== null) {
			clearInterval(this.clockUiIntervalId);
			this.clockUiIntervalId = null;
		}
	}
}