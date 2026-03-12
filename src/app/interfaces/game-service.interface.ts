import { GameState } from '../core/rules/game-state';
import { Move } from '../core/rules/move';

export interface IGameService {
  state: GameState;
  selectedSquare: number | null;
  legalMoves: Move[];
  showGameOverDialog: boolean;
  showPromotionDialog: boolean;
  pendingPromotionMoves: Move[] | null;

  handleSquareClick(rank: number, file: number): void;
  resetGame(): void;
  onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void;
  closePromotionDialog(): void;
  closeGameOverDialog(): void;
  getResultMessage(): string;
}