import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { GameOverDialogComponent } from './game-over-dialog/game-over-dialog.component';
import { PromotionDialogComponent } from './promotion-dialog/promotion-dialog.component';
import { BOARD_SIZE } from '../../core/constants/chess.constants';
import { IGameService } from '../../interfaces/game-service.interface';
import { TimeControl } from '../../interfaces/time-control.interface';
import { LocalGameService } from '../../services/local-game.service';
import { SoundService } from '../../services/sound.service';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [CommonModule, GameOverDialogComponent, PromotionDialogComponent],
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

	private clockUiIntervalId: number | null = null;

	constructor(
		private route: ActivatedRoute,
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
			console.log('Gamemode : ', mode, 'TimeControl:', timeControl);
			this.selectService(mode, timeControl);
		});

		// In zoneless change detection, UI won't update from setInterval in services.
		this.clockUiIntervalId = window.setInterval(() => {
			if (!this.clockEnabled) return;
			this.cdr.detectChanges();
		}, 200);
	}

	private parseSide(baseMinutesRaw: string | null, incrementSecondsRaw: string | null): { baseMinutes: number; incrementSeconds: number } {
		const baseMinutes = Number(baseMinutesRaw ?? '0');
		const incrementSeconds = Number(incrementSecondsRaw ?? '0');
		return {
			baseMinutes: Number.isFinite(baseMinutes) && baseMinutes > 0 ? Math.floor(baseMinutes) : 0,
			incrementSeconds: Number.isFinite(incrementSeconds) && incrementSeconds > 0 ? Math.floor(incrementSeconds) : 0
		};
	}

	private parseTimeControl(
		baseW: string | null,
		incW: string | null,
		baseB: string | null,
		incB: string | null
	): TimeControl {
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

	onSquareClick(rank: number, file: number): void {
		this.gameService?.handleSquareClick(rank, file);
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

	private formatTime(ms: number): string {
		const clamped = Math.max(0, ms);
		const totalSeconds = Math.floor(clamped / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	formatClockTime(color: 'white' | 'black'): string {
		const tc = this.timeControl;
		if (tc && tc[color].baseMinutes === 0) return '∞';
		return this.formatTime(color === 'white' ? this.whiteTimeMs : this.blackTimeMs);
	}

	ngOnDestroy(): void {
		this.gameService?.destroy?.();
		if (this.clockUiIntervalId !== null) {
			clearInterval(this.clockUiIntervalId);
			this.clockUiIntervalId = null;
		}
	}
}
