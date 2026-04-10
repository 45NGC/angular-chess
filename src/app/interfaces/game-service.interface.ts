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
