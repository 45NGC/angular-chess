import { GameState } from '../core/rules/game-state';
import { Board, fromIndex } from '../core/board/board';
import { Move } from '../core/rules/move';
import { AttackedSquares } from '../core/rules/attacked-squares';
import { loadFEN } from '../core/board/fen';
import { INITIAL_POSITION_FEN } from '../core/constants/chess.constants';
import { IGameService } from '../interfaces/game-service.interface';
import { SoundService } from './sound.service';
import { AiModeSettings } from '../interfaces/ai-mode.interface';
import { toFEN } from '../core/board/fen';
import { StockfishService } from './stockfish.service';
import { MoveNavigableGame } from './shared/move-navigation';

type Side = 'white' | 'black';

export class AiGameService extends MoveNavigableGame implements IGameService {
	override isPaused = false;

	private stockfish = new StockfishService();

	private difficulty: AiModeSettings['difficulty'];
	readonly playerColor: Side;
	private aiColor: Side;
	private aiMoveTimeoutId: number | null = null;
	private aiRequestId = 0;
	private render: (() => void) | null = null;

	constructor(
		private soundService: SoundService,
		settings: AiModeSettings,
		requestRender: (() => void) | null = null
	) {
		super();
		this.difficulty = settings.difficulty;
		this.playerColor = this.resolvePlayerColor(settings.playerColor);
		this.aiColor = this.playerColor === 'white' ? 'black' : 'white';
		this.render = requestRender;
		this.resetGame();
	}

	resetGame(): void {
		this.clearPendingAiMove();
		this.aiRequestId++;
		const board = new Board();
		loadFEN(board, INITIAL_POSITION_FEN);
		this.state = new GameState(board);
		this.resetInteractionState();
		this.resetNavigationState();
		this.isPaused = false;

		this.maybeQueueAiMove();
		this.requestRender();
	}

	private resolvePlayerColor(color: AiModeSettings['playerColor']): Side {
		if (color === 'white' || color === 'black') return color;
		return Math.random() < 0.5 ? 'white' : 'black';
	}

	closeGameOverDialog(): void {
		this.dismissGameOverDialog();
		this.requestRender();
	}

	protected override canInteractWithBoard(): boolean {
		return this.state.result.type === 'ongoing'
			&& !this.isPaused
			&& !this.reviewOnly
			&& this.state.turn === this.playerColor;
	}

	protected override canSubmitPromotionSelection(): boolean {
		return this.state.turn === this.playerColor;
	}

	protected override handleIllegalMoveTarget(): void {
		this.soundService.playError();
	}

	protected override submitResolvedMove(move: Move): void {
		this.applyMove(move);
	}

	protected override afterMoveSubmitted(): void {
		this.maybeQueueAiMove();
	}

	private applyMove(move: Move): void {
		this.clearPendingAiMove();
		this.aiRequestId++;

		const mover = this.state.turn;
		const isCapture = Boolean(this.state.board.get(move.to)) || move.enPassant === true;

		// A new move invalidates any "future" moves.
		if (this.redoHistory.length > 0) this.redoHistory = [];

		this.moveHistory.push(move);
		this.state.applyMove(move);

		const isCheck = AttackedSquares.isKingInCheck(this.state.board, this.state.turn);

		// Sounds
		if (isCheck) {
			this.soundService.playCheck();
		} else if (isCapture) {
			this.soundService.playCapture();
		} else {
			this.soundService.playMove();
		}

		this.checkGameOver();

		// If the AI just moved, clear any human selection leftovers.
		if (mover === this.aiColor) {
			this.clearSelection();
			this.closePromotionDialog();
		}

		this.requestRender();
	}

	protected override beforeHistoryNavigation(): void {
		this.clearPendingAiMove();
		this.aiRequestId++;
		this.stockfish.stop();
	}

	protected override afterRedoMove(): void {
		// If we've returned to the latest position, allow the AI to move if it's its turn.
		if (this.redoHistory.length === 0) {
			this.maybeQueueAiMove();
		}
	}

	private checkGameOver(): void {
		if (this.state.result.type !== 'ongoing') {
			this.soundService.playEnd();
			this.markGameOverReached();
		}
	}

	private maybeQueueAiMove(): void {
		if (this.isPaused) return;
		if (this.reviewOnly) return;
		if (this.state.result.type !== 'ongoing') return;
		if (this.state.turn !== this.aiColor) return;
		if (this.showPromotionDialog || this.pendingPromotionMoves) return;

		this.clearPendingAiMove();
		// Small delay so the UI can render the player's move before the AI responds.
		this.aiMoveTimeoutId = window.setTimeout(() => {
			this.aiMoveTimeoutId = null;
			void this.makeAiMove();
			this.requestRender?.();
		}, 250);
	}

	private async makeAiMove(): Promise<void> {
		if (this.isPaused) return;
		if (this.state.result.type !== 'ongoing') return;
		if (this.state.turn !== this.aiColor) return;
		const requestId = ++this.aiRequestId;

		const fen = toFEN(this.state.board, this.state.turn);
		const bestmove = await this.stockfish.getBestMove({
			fen,
			skillLevel: this.skillForDifficulty(this.difficulty),
			moveTimeMs: this.moveTimeForDifficulty(this.difficulty)
		}).catch((err) => {
			console.warn('Stockfish failed to provide bestmove:', err);
			return null;
		});

		if (requestId !== this.aiRequestId) return;
		if (!bestmove) return;

		const move = this.uciToMove(bestmove);
		if (!move) return;
		this.applyMove(move);
	}

	private clearPendingAiMove(): void {
		if (this.aiMoveTimeoutId === null) return;
		clearTimeout(this.aiMoveTimeoutId);
		this.aiMoveTimeoutId = null;
	}

	pause(): void {
		if (this.isPaused) return;
		// Allow pausing while in "review mode"
		if (this.state.result.type !== 'ongoing' && !this.reviewOnly) return;
		if (this.pendingPromotionMoves || this.showPromotionDialog) return;

		this.isPaused = true;
		this.clearSelection();
		this.clearPendingAiMove();
		// Invalidate any in-flight Stockfish request and request the engine to stop ASAP.
		this.aiRequestId++;
		this.stockfish.stop();
		this.requestRender();
	}

	resume(): void {
		if (!this.isPaused) return;
		this.isPaused = false;
		this.requestRender();
		this.maybeQueueAiMove();
	}

	override destroy(): void {
		this.clearPendingAiMove();
		this.aiRequestId++;
		this.stockfish.destroy();
	}

	protected override requestRender(): void {
		this.render?.();
	}

	private skillForDifficulty(difficulty: AiModeSettings['difficulty']): number {
		switch (difficulty) {
			case 'beginner': return 1;
			case 'intermediate': return 6;
			case 'advanced': return 12;
			case 'expert': return 20;
		}
	}

	private moveTimeForDifficulty(difficulty: AiModeSettings['difficulty']): number {
		switch (difficulty) {
			case 'beginner': return 700;
			case 'intermediate': return 1100;
			case 'advanced': return 1600;
			case 'expert': return 2000;
		}
	}

	private uciToMove(uci: string): Move | null {
		const trimmed = uci.trim();
		if (trimmed.length < 4) return null;

		const from = algebraicToIndex(trimmed.slice(0, 2));
		const to = algebraicToIndex(trimmed.slice(2, 4));
		if (from == null || to == null) return null;

		const piece = this.state.board.get(from);
		if (!piece) return { from, to };

		let promotion: Move['promotion'] | undefined;
		const promoChar = trimmed.length >= 5 ? trimmed[4] : null;
		if (promoChar) {
			promotion =
				promoChar === 'q' ? 'queen' :
					promoChar === 'r' ? 'rook' :
						promoChar === 'b' ? 'bishop' :
							promoChar === 'n' ? 'knight' :
								undefined;
		}

		let castling: Move['castling'] | undefined;
		if (piece.type === 'king') {
			const { file: fromFile } = fromIndex(from);
			const { file: toFile } = fromIndex(to);
			if (Math.abs(toFile - fromFile) === 2) {
				castling = toFile > fromFile ? 'kingSide' : 'queenSide';
			}
		}

		let enPassant: boolean | undefined;
		if (piece.type === 'pawn') {
			const { file: fromFile } = fromIndex(from);
			const { file: toFile } = fromIndex(to);
			const isDiagonal = Math.abs(toFile - fromFile) === 1;
			if (isDiagonal && this.state.board.get(to) == null && this.state.board.enPassantTarget === to) {
				enPassant = true;
			}
		}

		return { from, to, promotion, castling, enPassant };
	}
}

function algebraicToIndex(square: string): number | null {
	if (square.length !== 2) return null;
	const fileChar = square[0];
	const rankChar = square[1];
	const file = fileChar.charCodeAt(0) - 'a'.charCodeAt(0);
	const rank = Number(rankChar) - 1;
	if (!Number.isInteger(file) || !Number.isInteger(rank)) return null;
	if (file < 0 || file > 7) return null;
	if (rank < 0 || rank > 7) return null;
	return rank * 8 + file;
}
