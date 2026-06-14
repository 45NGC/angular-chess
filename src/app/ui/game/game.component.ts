import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { GameOverDialogComponent } from './game-over-dialog/game-over-dialog.component';
import { PromotionDialogComponent } from './promotion-dialog/promotion-dialog.component';
import { ClockComponent } from './clock/clock.component';
import { PauseButtonComponent } from './pause-button/pause-button.component';
import { PauseOverlayComponent } from './pause-overlay/pause-overlay.component';
import { RotationButtonComponent } from './rotation-button/rotation-button.component';
import { MoveNavigationButtonsComponent } from './move-navigation-buttons/move-navigation-buttons.component';
import { BOARD_SIZE } from '../../core/constants/chess.constants';
import { Move } from '../../core/rules/move';
import { AttackedSquares } from '../../core/rules/attacked-squares';
import { Board } from '../../core/board/board';
import { IGameService } from '../../interfaces/game-service.interface';
import { TimeControl } from '../../interfaces/time-control.interface';
import { LocalGameService } from '../../services/local-game.service';
import { SoundService } from '../../services/sound.service';
import { AiGameService } from '../../services/ai-game.service';
import { AiModeSettings } from '../../interfaces/ai-mode.interface';
import { OnlineGameService } from '../../services/online-game.service';
import { OnlineRoomService } from '../../services/online-room.service';

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
		RotationButtonComponent,
		MoveNavigationButtonsComponent,
	],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
	private readonly ranksWhite = Array.from({ length: BOARD_SIZE }, (_, i) => 7 - i);
	private readonly filesWhite = Array.from({ length: BOARD_SIZE }, (_, i) => i);
	private readonly ranksBlack = Array.from({ length: BOARD_SIZE }, (_, i) => i);
	private readonly filesBlack = Array.from({ length: BOARD_SIZE }, (_, i) => 7 - i);

	mode: 'local' | 'ai' | 'online' | null = null;
	private manualBoardOrientation: 'white' | 'black' = 'white';
	autoRotateBoardLocal = false;
	@ViewChild('boardEl') private boardEl?: ElementRef<HTMLElement>;

	dragSourceSquare: number | null = null;
	dragPreview: { src: string; x: number; y: number; size: number } | null = null;
	private dragCandidate: { fromRank: number; fromFile: number; pointerId: number; startX: number; startY: number } | null = null;
	private draggingPointerId: number | null = null;
	private suppressClickTimeoutId: number | null = null;
	private suppressClick = false;

	private cachedCheck:
		| { board: Board; turn: 'white' | 'black'; kingSquare: number; inCheck: boolean }
		| null = null;

	get boardOrientation(): 'white' | 'black' {
		if (this.mode === 'local' && this.autoRotateBoardLocal) {
			return this.state?.turn ?? this.manualBoardOrientation;
		}
		return this.manualBoardOrientation;
	}

	get ranks(): number[] {
		return this.boardOrientation === 'white' ? this.ranksWhite : this.ranksBlack;
	}

	get files(): number[] {
		return this.boardOrientation === 'white' ? this.filesWhite : this.filesBlack;
	}

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
	get isReviewOnly(): boolean { return this.gameService?.isReviewOnly?.() ?? false; }
	get lastMove(): Move | null {
		const history = this.moveHistory;
		return history.length > 0 ? history[history.length - 1] : null;
	}
	get pauseSupported() {
		return typeof this.gameService?.pause === 'function' && typeof this.gameService?.resume === 'function';
	}
	get pauseDisabled() {
		return !this.pauseSupported || this.showPromotionDialog || !!this.pendingPromotionMoves || (this.showGameOverDialog && !this.isReviewOnly);
	}

	get moveNavigationSupported(): boolean {
		return typeof this.gameService?.undoMove === 'function' && typeof this.gameService?.redoMove === 'function';
	}

	get canUndoMove(): boolean {
		return this.gameService?.canUndoMove?.() ?? false;
	}

	get canRedoMove(): boolean {
		return this.gameService?.canRedoMove?.() ?? false;
	}

	get moveNavigationDisabled(): boolean {
		// Do not allow history navigation while modal interactions are active.
		return this.isPaused || this.showPromotionDialog || !!this.pendingPromotionMoves;
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
		private cdr: ChangeDetectorRef,
		private onlineRoomService: OnlineRoomService
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
			const aiMode = this.parseAiMode(query.get('difficulty'), query.get('color'));
			this.selectService(mode, timeControl, aiMode, query.get('code'), query.get('playerId'), query.get('side'));
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
		if (this.suppressClick) {
			this.suppressClick = false;
			return;
		}
		this.gameService?.handleSquareClick(rank, file);
	}

	isKingInCheckSquare(square: number): boolean {
		const state = this.state;
		if (!state) return false;

		const board = state.board;
		const turn = state.turn;
		const cached = this.cachedCheck;

		if (cached && cached.board === board && cached.turn === turn) {
			return cached.inCheck && cached.kingSquare === square;
		}

		const kingSquare = board.findKing(turn);
		const inCheck = AttackedSquares.isKingInCheck(board, turn);

		this.cachedCheck = { board, turn, kingSquare, inCheck };
		return inCheck && kingSquare === square;
	}

	onPiecePointerDown(event: PointerEvent, rank: number, file: number): void {
		if (!this.gameService) return;
		if (!this.canDragSquare(rank, file)) return;

		// Prevent browser default image dragging/selection.
		event.preventDefault();

		this.dragCandidate = {
			fromRank: rank,
			fromFile: file,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY
		};

		// Select the piece so legal targets are highlighted (same behaviour as click).
		this.gameService.handleSquareClick(rank, file);

		const target = event.target;
		if (target instanceof HTMLElement && typeof target.setPointerCapture === 'function') {
			try {
				target.setPointerCapture(event.pointerId);
			} catch {
				// Ignore capture failures (e.g. if pointer already captured).
			}
		}
	}

	@HostListener('document:pointermove', ['$event'])
	onDocumentPointerMove(event: PointerEvent): void {
		const candidate = this.dragCandidate;
		if (!candidate) return;
		if (event.pointerId !== candidate.pointerId) return;

		const dx = event.clientX - candidate.startX;
		const dy = event.clientY - candidate.startY;
		const distance = Math.hypot(dx, dy);

		// Start dragging after a small threshold to allow normal clicks.
		if (this.draggingPointerId === null) {
			if (distance < 5) return;
			const preview = this.createDragPreview(candidate.fromRank, candidate.fromFile, event.clientX, event.clientY);
			if (!preview) return;

			this.draggingPointerId = candidate.pointerId;
			this.dragPreview = preview;
			this.dragSourceSquare = candidate.fromRank * 8 + candidate.fromFile;
			return;
		}

		if (event.pointerId !== this.draggingPointerId) return;
		this.updateDragPreview(event.clientX, event.clientY);
	}

	@HostListener('document:pointerup', ['$event'])
	onDocumentPointerUp(event: PointerEvent): void {
		const candidate = this.dragCandidate;
		if (!candidate) return;
		if (event.pointerId !== candidate.pointerId) return;

		const wasDragging = this.draggingPointerId !== null;
		const fromRank = candidate.fromRank;
		const fromFile = candidate.fromFile;

		this.dragCandidate = null;
		this.draggingPointerId = null;
		this.dragPreview = null;
		this.dragSourceSquare = null;

		if (!wasDragging) {
			// No drag happened: keep normal selection behaviour (already selected on pointerdown).
			return;
		}

		this.suppressClick = true;
		if (this.suppressClickTimeoutId !== null) {
			clearTimeout(this.suppressClickTimeoutId);
		}
		this.suppressClickTimeoutId = window.setTimeout(() => {
			this.suppressClick = false;
			this.suppressClickTimeoutId = null;
		}, 0);

		if (!this.gameService) return;
		const target = this.squareAtClientPoint(event.clientX, event.clientY);
		if (!target) return;
		if (target.rank === fromRank && target.file === fromFile) return;

		const toSquare = target.rank * 8 + target.file;
		const isLegal = this.legalMoves.some(m => m.to === toSquare);
		if (!isLegal) {
			this.soundService.playError();
			return;
		}

		// Origin is already selected; dropping on a legal square executes the move.
		this.gameService.handleSquareClick(target.rank, target.file);
	}

	@HostListener('document:pointercancel', ['$event'])
	onDocumentPointerCancel(event: PointerEvent): void {
		const candidate = this.dragCandidate;
		if (!candidate) return;
		if (event.pointerId !== candidate.pointerId) return;
		this.dragCandidate = null;
		this.draggingPointerId = null;
		this.dragPreview = null;
		this.dragSourceSquare = null;
	}

	private createDragPreview(fromRank: number, fromFile: number, clientX: number, clientY: number): { src: string; x: number; y: number; size: number } | null {
		const rect = this.boardEl?.nativeElement.getBoundingClientRect();
		if (!rect) return null;
		const size = rect.width / 8;

		const piece = this.state?.board.get(fromRank * 8 + fromFile);
		const src = this.pieceToImage(piece);
		if (!src) return null;

		return {
			src,
			x: clientX - rect.left,
			y: clientY - rect.top,
			size
		};
	}

	private updateDragPreview(clientX: number, clientY: number): void {
		const rect = this.boardEl?.nativeElement.getBoundingClientRect();
		if (!rect || !this.dragPreview) return;
		this.dragPreview = {
			...this.dragPreview,
			x: clientX - rect.left,
			y: clientY - rect.top
		};
	}

	private squareAtClientPoint(clientX: number, clientY: number): { rank: number; file: number } | null {
		const rect = this.boardEl?.nativeElement.getBoundingClientRect();
		if (!rect) return null;
		if (clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom) return null;

		const squareSize = rect.width / 8;
		const col = Math.floor((clientX - rect.left) / squareSize);
		const row = Math.floor((clientY - rect.top) / squareSize);
		if (row < 0 || row > 7 || col < 0 || col > 7) return null;

		const rank = this.ranks[row];
		const file = this.files[col];
		return { rank, file };
	}

	canDragSquare(rank: number, file: number): boolean {
		const service = this.gameService;
		const state = this.state;
		if (!service || !state) return false;
		if (service.isReviewOnly?.()) return false;
		if (this.showGameOverDialog) return false;
		if (this.showPromotionDialog || this.pendingPromotionMoves) return false;
		if (this.isPaused) return false;

		const piece = state.board.get(rank * 8 + file);
		if (!piece) return false;
		if (piece.color !== state.turn) return false;
		// In AI mode, only allow dragging the human side.
		if (service instanceof AiGameService && state.turn !== service.playerColor) return false;
		if (service instanceof OnlineGameService && state.turn !== service.playerSide) return false;
		return true;
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

	private selectService(
		mode: string | null,
		timeControl: TimeControl,
		aiMode: AiModeSettings,
		roomCode: string | null,
		playerId: string | null,
		playerSide: string | null
	): void {
		this.gameService?.destroy?.();
		this.dragCandidate = null;
		this.draggingPointerId = null;
		this.dragPreview = null;
		this.dragSourceSquare = null;
		this.suppressClick = false;
		if (this.suppressClickTimeoutId !== null) {
			clearTimeout(this.suppressClickTimeoutId);
			this.suppressClickTimeoutId = null;
		}
		this.gameService?.clearSelection();
		switch (mode) {
			case 'local':
				this.mode = 'local';
				this.autoRotateBoardLocal = false;
				this.manualBoardOrientation = 'white';
				this.gameService = new LocalGameService(this.soundService, timeControl);
				break;
			case 'ai':
				this.mode = 'ai';
				this.autoRotateBoardLocal = false;
				{
					const service = new AiGameService(this.soundService, aiMode, () => this.cdr.detectChanges());
					this.gameService = service;
					this.manualBoardOrientation = service.playerColor;
				}
				break;
			case 'online':
				if (!roomCode || !playerId || (playerSide !== 'white' && playerSide !== 'black')) {
					console.error('Missing online game params.');
					this.mode = null;
					this.gameService = null;
					break;
				}
				this.mode = 'online';
				this.autoRotateBoardLocal = false;
				{
					const service = new OnlineGameService(
						this.soundService,
						this.onlineRoomService,
						{ roomCode, playerId, playerSide },
						() => this.cdr.detectChanges()
					);
					this.gameService = service;
					this.manualBoardOrientation = service.playerSide;
				}
				break;
			default:
				console.error('Modo de juego no soportado:', mode);
				this.mode = null;
				this.gameService = null;
		}
	}

	toggleBoardOrientation(): void {
		// Manual rotation should override auto-rotation.
		if (this.mode === 'local' && this.autoRotateBoardLocal) {
			this.autoRotateBoardLocal = false;
			// Preserve current orientation when turning auto off.
			if (this.state) this.manualBoardOrientation = this.state.turn;
		}
		this.manualBoardOrientation = this.boardOrientation === 'white' ? 'black' : 'white';
	}

	toggleAutoRotateBoardLocal(): void {
		if (this.mode !== 'local') return;
		this.autoRotateBoardLocal = !this.autoRotateBoardLocal;
		// Keep board stable when toggling auto-rotation.
		if (this.state) this.manualBoardOrientation = this.state.turn;
	}

	private parseAiMode(difficultyRaw: string | null, colorRaw: string | null): AiModeSettings {
		const difficulty: AiModeSettings['difficulty'] =
			difficultyRaw === 'beginner' || difficultyRaw === 'intermediate' || difficultyRaw === 'advanced' || difficultyRaw === 'expert'
				? difficultyRaw
				: 'beginner';

		const playerColor: AiModeSettings['playerColor'] =
			colorRaw === 'white' || colorRaw === 'black' || colorRaw === 'random'
				? colorRaw
				: 'random';

		return { difficulty, playerColor };
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

	undoMove(): void {
		if (this.moveNavigationDisabled) return;
		this.gameService?.undoMove?.();
	}

	redoMove(): void {
		if (this.moveNavigationDisabled) return;
		this.gameService?.redoMove?.();
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
		this.quitToHome();
	}

	onCloseGameOverDialog(): void {
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
		if (this.suppressClickTimeoutId !== null) {
			clearTimeout(this.suppressClickTimeoutId);
			this.suppressClickTimeoutId = null;
		}
	}
}
