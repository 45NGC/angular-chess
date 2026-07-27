import { Board, toIndex } from '../../core/board/board';
import { GameState } from '../../core/rules/game-state';
import { LegalMoveFinder } from '../../core/rules/legal-move-finder';
import { Move } from '../../core/rules/move';
import { IGameService } from '../../interfaces/game-service.interface';

export abstract class GameplayService implements IGameService {
	state!: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	showGameOverDialog = false;
	showPromotionDialog = false;
	pendingPromotionMoves: Move[] | null = null;

	protected readonly moveFinder = new LegalMoveFinder();

	handleSquareClick(rank: number, file: number): void {
		if (!this.canInteractWithBoard() || this.pendingPromotionMoves) {
			return;
		}

		const square = toIndex(rank, file);
		const piece = this.state.board.get(square);

		if (this.selectedSquare === null) {
			this.trySelectSquare(piece, square);
			return;
		}

		if (this.isCurrentTurnPiece(piece)) {
			this.showLegalMoves(square);
			return;
		}

		this.tryMoveToSquare(square);
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		if (!this.pendingPromotionMoves || !this.canSubmitPromotionSelection()) {
			return;
		}

		const move = this.pendingPromotionMoves.find(candidate => candidate.promotion === pieceType);
		if (!move) {
			return;
		}

		this.submitResolvedMove(move);
		this.closePromotionDialog();
		this.afterMoveSubmitted(move);
	}

	closePromotionDialog(): void {
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.clearSelection();
		this.requestRender();
	}

	getResultMessage(): string {
		const timeoutWinner = this.getTimeoutWinnerOverride();
		if (timeoutWinner) {
			return `${timeoutWinner === 'white' ? 'WHITE' : 'BLACK'} WON ON TIME`;
		}

		switch (this.state.result.type) {
			case 'checkmate':
				return `${this.state.result.winner === 'white' ? 'WHITE' : 'BLACK'} WON`;
			case 'draw':
				return this.state.result.reason === 'insufficientMaterial'
					? 'DRAW (INSUFFICIENT MATERIAL)'
					: 'DRAW (THREEFOLD REPETITION)';
			case 'stalemate':
				return 'STALEMATE';
			case 'timeout':
				return `${this.state.result.winner === 'white' ? 'WHITE' : 'BLACK'} WON ON TIME`;
			default:
				return '';
		}
	}

	clearSelection(): void {
		this.selectedSquare = null;
		this.legalMoves = [];
	}

	abstract resetGame(): void;
	abstract closeGameOverDialog(): void;

	protected resetInteractionState(): void {
		this.selectedSquare = null;
		this.legalMoves = [];
		this.showGameOverDialog = false;
		this.showPromotionDialog = false;
		this.pendingPromotionMoves = null;
	}

	protected isCurrentTurnPiece(piece: ReturnType<Board['get']>): boolean {
		return piece != null && piece.color === this.state.turn;
	}

	protected canSubmitPromotionSelection(): boolean {
		return true;
	}

	protected getTimeoutWinnerOverride(): 'white' | 'black' | null {
		return null;
	}

	protected afterMoveSubmitted(_move: Move): void { }

	protected requestRender(): void { }

	protected abstract canInteractWithBoard(): boolean;
	protected abstract handleIllegalMoveTarget(): void;
	protected abstract submitResolvedMove(move: Move): void;

	private trySelectSquare(piece: ReturnType<Board['get']>, square: number): void {
		if (!this.isCurrentTurnPiece(piece)) {
			return;
		}

		this.showLegalMoves(square);
	}

	private showLegalMoves(square: number): void {
		this.selectedSquare = square;
		this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, square);
	}

	private tryMoveToSquare(square: number): void {
		const movesToSquare = this.legalMoves.filter(move => move.to === square);
		if (movesToSquare.length === 0) {
			this.handleIllegalMoveTarget();
			this.clearSelection();
			this.requestRender();
			return;
		}

		if (movesToSquare.length === 1) {
			this.submitResolvedMove(movesToSquare[0]);
			this.clearSelection();
			this.afterMoveSubmitted(movesToSquare[0]);
			return;
		}

		this.pendingPromotionMoves = movesToSquare;
		this.showPromotionDialog = true;
		this.requestRender();
	}
}
