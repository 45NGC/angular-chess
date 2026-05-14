import { IGameService } from '../../interfaces/game-service.interface';
import { Move } from '../../core/rules/move';
import { buildGameStateFromMoves } from '../../core/rules/move-history';
import { GameState } from '../../core/rules/game-state';

export abstract class MoveNavigableGame implements IGameService {
	abstract state: GameState;
	abstract selectedSquare: number | null;
	abstract legalMoves: Move[];
	abstract showGameOverDialog: boolean;
	abstract showPromotionDialog: boolean;
	abstract pendingPromotionMoves: Move[] | null;

	isPaused?: boolean;
	moveHistory: Move[] = [];
	protected redoHistory: Move[] = [];

	abstract handleSquareClick(rank: number, file: number): void;
	abstract resetGame(): void;
	abstract onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void;
	abstract closePromotionDialog(): void;
	abstract closeGameOverDialog(): void;
	abstract getResultMessage(): string;
	abstract clearSelection(): void;

	destroy?(): void;

	canUndoMove(): boolean {
		return this.moveHistory.length > 0;
	}

	canRedoMove(): boolean {
		return this.redoHistory.length > 0;
	}

	undoMove(): void {
		if (!this.canUndoMove()) return;
		if (this.isPaused) return;
		if (this.pendingPromotionMoves || this.showPromotionDialog) return;

		this.beforeHistoryNavigation();

		const last = this.moveHistory.pop();
		if (!last) return;

		this.redoHistory.push(last);

		this.onHistoryNavigationStep();

		this.clearSelection();
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.showGameOverDialog = false;

		this.rebuildStateFromMoveHistory();
		this.afterHistoryRebuild();
		this.requestRender();
	}

	redoMove(): void {
		if (!this.canRedoMove()) return;
		if (this.isPaused) return;
		if (this.pendingPromotionMoves || this.showPromotionDialog) return;

		this.beforeHistoryNavigation();

		const next = this.redoHistory.pop();
		if (!next) return;

		this.moveHistory.push(next);

		this.onHistoryNavigationStep();

		this.clearSelection();
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.showGameOverDialog = false;

		this.rebuildStateFromMoveHistory();
		this.afterHistoryRebuild();
		this.requestRender();
		this.afterRedoMove();
	}

	protected rebuildStateFromMoveHistory(): void {
		this.state = buildGameStateFromMoves(this.moveHistory);
		this.clearSelection();
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
	}

	protected afterHistoryRebuild(): void {
		this.showGameOverDialog = this.state.result.type !== 'ongoing';
	}

	// Hooks for concrete services
	protected beforeHistoryNavigation(): void { }
	protected onHistoryNavigationStep(): void { }
	protected afterRedoMove(): void { }
	protected requestRender(): void { }
}

