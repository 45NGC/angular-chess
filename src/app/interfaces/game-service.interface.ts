import { GameState } from '../core/rules/game-state';
import { Move } from '../core/rules/move';
import { TimeControl } from './time-control.interface';

export interface IGameService {
  state: GameState;
  selectedSquare: number | null;
  legalMoves: Move[];
  showGameOverDialog: boolean;
  showPromotionDialog: boolean;
  pendingPromotionMoves: Move[] | null;

  // Optional pause data (local games, etc.)
  isPaused?: boolean;
  pause?(): void;
  resume?(): void;

  // Optional move history data (local games, etc.)
  moveHistory?: Move[];
  // Optional "review mode" (post-game history navigation only)
  isReviewOnly?(): boolean;
  // Optional undo/redo navigation (local + AI games)
  canUndoMove?(): boolean;
  canRedoMove?(): boolean;
  undoMove?(): void;
  redoMove?(): void;

  // Optional clock data (local games, etc.)
  timeControl?: TimeControl;
  clockEnabled?: boolean;
  whiteTimeMs?: number;
  blackTimeMs?: number;
  activeClockColor?: 'white' | 'black' | null;

  handleSquareClick(rank: number, file: number): void;
  resetGame(): void;
  onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void;
  closePromotionDialog(): void;
  closeGameOverDialog(): void;
  getResultMessage(): string;
  clearSelection(): void;

  destroy?(): void;
}
