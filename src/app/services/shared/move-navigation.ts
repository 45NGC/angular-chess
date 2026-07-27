import { Move } from '../../core/rules/move';
import { buildGameStateFromMoves } from '../../core/rules/move-history';
import { GameplayService } from './gameplay-service';

export abstract class MoveNavigableGame extends GameplayService {
	isPaused?: boolean;
	moveHistory: Move[] = [];
	protected redoHistory: Move[] = [];
	/**
	 * Once a game reaches a terminal result, we lock the game into "review mode":
	 * users may navigate the history (undo/redo), but cannot create new moves.
	 */
	protected reviewOnly = false;
	protected gameOverDialogDismissed = false;

	abstract override resetGame(): void;
	abstract override closeGameOverDialog(): void;

	destroy?(): void;

	isReviewOnly(): boolean {
		return this.reviewOnly;
	}

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
		this.showGameOverDialog = this.state.result.type !== 'ongoing' && !this.gameOverDialogDismissed;
	}

	protected markGameOverReached(): void {
		this.reviewOnly = true;
		this.gameOverDialogDismissed = false;
		this.showGameOverDialog = true;
	}

	protected dismissGameOverDialog(): void {
		this.gameOverDialogDismissed = true;
		this.showGameOverDialog = false;
	}

	protected resetNavigationState(): void {
		this.moveHistory = [];
		this.redoHistory = [];
		this.reviewOnly = false;
		this.gameOverDialogDismissed = false;
	}

	// Hooks for concrete services
	protected beforeHistoryNavigation(): void { }
	protected onHistoryNavigationStep(): void { }
	protected afterRedoMove(): void { }
	protected override requestRender(): void { }
}
