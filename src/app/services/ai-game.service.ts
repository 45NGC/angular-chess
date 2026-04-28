import { GameState } from '../core/rules/game-state';
import { Board, fromIndex, toIndex } from '../core/board/board';
import { Move } from '../core/rules/move';
import { AttackedSquares } from '../core/rules/attacked-squares';
import { LegalMoveFinder } from '../core/rules/legal-move-finder';
import { loadFEN } from '../core/board/fen';
import { INITIAL_POSITION_FEN } from '../core/constants/chess.constants';
import { IGameService } from '../interfaces/game-service.interface';
import { SoundService } from './sound.service';
import { AiModeSettings } from '../interfaces/ai-mode.interface';
import { toFEN } from '../core/board/fen';
import { StockfishService } from './stockfish.service';

type Side = 'white' | 'black';

export class AiGameService implements IGameService {
	state!: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	showGameOverDialog = false;
	showPromotionDialog = false;
	pendingPromotionMoves: Move[] | null = null;
	moveHistory: Move[] = [];

	private moveFinder = new LegalMoveFinder();
	private stockfish = new StockfishService();

	private difficulty: AiModeSettings['difficulty'];
	private playerColor: Side;
	private aiColor: Side;
	private aiMoveTimeoutId: number | null = null;
	private aiRequestId = 0;

	constructor(
		private soundService: SoundService,
		settings: AiModeSettings,
		private requestRender: (() => void) | null = null
	) {
		this.difficulty = settings.difficulty;
		this.playerColor = this.resolvePlayerColor(settings.playerColor);
		this.aiColor = this.playerColor === 'white' ? 'black' : 'white';
		this.resetGame();
	}

	resetGame(): void {
		this.clearPendingAiMove();
		this.aiRequestId++;
		const board = new Board();
		loadFEN(board, INITIAL_POSITION_FEN);
		this.state = new GameState(board);
		this.selectedSquare = null;
		this.legalMoves = [];
		this.showGameOverDialog = false;
		this.showPromotionDialog = false;
		this.pendingPromotionMoves = null;
		this.moveHistory = [];

		this.maybeQueueAiMove();
		this.requestRender?.();
	}

	handleSquareClick(rank: number, file: number): void {
		if (!this.canInteractWithBoard()) return;
		if (this.pendingPromotionMoves) return;
		if (this.state.turn !== this.playerColor) return;

		const square = toIndex(rank, file);
		const piece = this.state.board.get(square);

		if (this.selectedSquare === null) {
			this.trySelectSquare(piece, square);
			return;
		}

		if (this.isCurrentPlayerPiece(piece)) {
			this.showLegalMoves(square);
			return;
		}

		this.tryMoveToSquare(square);
	}

	private resolvePlayerColor(color: AiModeSettings['playerColor']): Side {
		if (color === 'white' || color === 'black') return color;
		return Math.random() < 0.5 ? 'white' : 'black';
	}

	private canInteractWithBoard(): boolean {
		return this.state.result.type === 'ongoing';
	}

	private isCurrentPlayerPiece(piece: ReturnType<Board['get']>): boolean {
		return piece != null && piece.color === this.state.turn;
	}

	private trySelectSquare(piece: ReturnType<Board['get']>, square: number): void {
		if (!piece) return;
		if (piece.color !== this.playerColor) return;
		if (this.state.turn !== this.playerColor) return;
		this.showLegalMoves(square);
	}

	clearSelection(): void {
		this.selectedSquare = null;
		this.legalMoves = [];
	}

	private tryMoveToSquare(square: number): void {
		const movesToSquare = this.legalMoves.filter(m => m.to === square);
		if (movesToSquare.length === 0) {
			this.clearSelection();
			this.requestRender?.();
			return;
		}

		if (movesToSquare.length === 1) {
			this.applyMoveAndCheckGameOver(movesToSquare[0]);
			this.clearSelection();
			this.requestRender?.();
			this.maybeQueueAiMove();
			return;
		}

		this.pendingPromotionMoves = movesToSquare;
		this.showPromotionDialog = true;
		this.requestRender?.();
	}

	private showLegalMoves(square: number): void {
		this.selectedSquare = square;
		this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, square);
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		if (!this.pendingPromotionMoves) return;
		if (this.state.turn !== this.playerColor) return;

		const move = this.pendingPromotionMoves.find(m => m.promotion === pieceType);
		if (move) {
			this.applyMoveAndCheckGameOver(move);
		}
		this.closePromotionDialog();
		this.requestRender?.();
		this.maybeQueueAiMove();
	}

	closePromotionDialog(): void {
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.clearSelection();
		this.requestRender?.();
	}

	closeGameOverDialog(): void {
		this.showGameOverDialog = false;
		this.requestRender?.();
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
		this.clearPendingAiMove();
		this.aiRequestId++;

		const mover = this.state.turn;
		const isCapture = Boolean(this.state.board.get(move.to)) || move.enPassant === true;

		this.moveHistory.push(move);
		this.state.applyMove(move);

		const kingSquare = this.state.board.findKing(this.state.turn);
		const attackerColor = this.state.turn === 'white' ? 'black' : 'white';

		const isCheck = AttackedSquares.isSquareAttacked(
			this.state.board,
			kingSquare,
			attackerColor
		);

		// Only play sounds on human moves + AI moves (same mapping as local)
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

		this.requestRender?.();
	}

	private checkGameOver(): void {
		if (this.state.result.type !== 'ongoing') {
			this.soundService.playEnd();
			this.showGameOverDialog = true;
		}
	}

	private maybeQueueAiMove(): void {
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
		this.applyMoveAndCheckGameOver(move);
	}

	private clearPendingAiMove(): void {
		if (this.aiMoveTimeoutId === null) return;
		clearTimeout(this.aiMoveTimeoutId);
		this.aiMoveTimeoutId = null;
	}

	destroy(): void {
		this.clearPendingAiMove();
		this.aiRequestId++;
		this.stockfish.destroy();
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
