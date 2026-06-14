import { GameState } from '../core/rules/game-state';
import { Board, toIndex } from '../core/board/board';
import { Move } from '../core/rules/move';
import { AttackedSquares } from '../core/rules/attacked-squares';
import { LegalMoveFinder } from '../core/rules/legal-move-finder';
import { IGameService } from '../interfaces/game-service.interface';
import { OnlineRoom, OnlineRoomSession } from '../interfaces/online-room.interface';
import { TimeControl } from '../interfaces/time-control.interface';
import { OnlineRoomService } from './online-room.service';
import { SoundService } from './sound.service';
import { Subscription } from 'rxjs';
import { buildGameStateFromMoves } from '../core/rules/move-history';

export class OnlineGameService implements IGameService {
	state!: GameState;
	selectedSquare: number | null = null;
	legalMoves: Move[] = [];
	showGameOverDialog = false;
	showPromotionDialog = false;
	pendingPromotionMoves: Move[] | null = null;
	moveHistory: Move[] = [];
	readonly playerSide: 'white' | 'black';

	timeControl: TimeControl;
	clockEnabled = false;
	whiteTimeMs = 0;
	blackTimeMs = 0;
	activeClockColor: 'white' | 'black' | null = null;

	private readonly moveFinder = new LegalMoveFinder();
	private readonly roomSubscription: Subscription;
	private room: OnlineRoom | null = null;

	constructor(
		private soundService: SoundService,
		private onlineRoomService: OnlineRoomService,
		private session: OnlineRoomSession,
		private requestRenderCallback: (() => void) | null = null
	) {
		this.playerSide = session.playerSide;
		const initialRoom = this.onlineRoomService.getRoom(session.roomCode);
		this.timeControl = initialRoom?.timeControlSettings ?? {
			white: { baseMinutes: 0, incrementSeconds: 0 },
			black: { baseMinutes: 0, incrementSeconds: 0 }
		};
		this.state = buildGameStateFromMoves([]);
		this.roomSubscription = this.onlineRoomService.watchRoom(session.roomCode).subscribe(room => {
			if (!room) return;
			this.applyRoom(room);
		});
	}

	handleSquareClick(rank: number, file: number): void {
		if (!this.canInteractWithBoard()) return;
		if (this.pendingPromotionMoves) return;

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

	resetGame(): void {
		// Online reset will come later via room-level rematch/reset flows.
	}

	onPromotionSelected(pieceType: 'queen' | 'rook' | 'bishop' | 'knight'): void {
		if (!this.pendingPromotionMoves) return;
		const move = this.pendingPromotionMoves.find(candidate => candidate.promotion === pieceType);
		if (!move) return;
		this.submitMove(move);
		this.closePromotionDialog();
	}

	closePromotionDialog(): void {
		this.pendingPromotionMoves = null;
		this.showPromotionDialog = false;
		this.clearSelection();
	}

	closeGameOverDialog(): void {
		this.showGameOverDialog = false;
	}

	getResultMessage(): string {
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

	destroy(): void {
		this.roomSubscription.unsubscribe();
	}

	private canInteractWithBoard(): boolean {
		if (this.room?.status !== 'ready' && this.room?.status !== 'playing') return false;
		if (this.state.result.type !== 'ongoing') return false;
		return this.state.turn === this.playerSide;
	}

	private isCurrentPlayerPiece(piece: ReturnType<Board['get']>): boolean {
		return piece != null && piece.color === this.state.turn;
	}

	private trySelectSquare(piece: ReturnType<Board['get']>, square: number): void {
		if (!piece) return;
		if (piece.color !== this.playerSide) return;
		if (piece.color !== this.state.turn) return;
		this.showLegalMoves(square);
	}

	private showLegalMoves(square: number): void {
		this.selectedSquare = square;
		this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, square);
	}

	private tryMoveToSquare(square: number): void {
		const movesToSquare = this.legalMoves.filter(move => move.to === square);
		if (movesToSquare.length === 0) {
			this.soundService.playError();
			this.clearSelection();
			this.requestRender();
			return;
		}

		if (movesToSquare.length === 1) {
			this.submitMove(movesToSquare[0]);
			this.clearSelection();
			return;
		}

		this.pendingPromotionMoves = movesToSquare;
		this.showPromotionDialog = true;
		this.requestRender();
	}

	private submitMove(move: Move): void {
		const result = this.onlineRoomService.submitMove(this.session.roomCode, this.session.playerId, move);
		if (!result.ok) {
			this.soundService.playError();
			return;
		}
		this.clearSelection();
		this.requestRender();
	}

	private applyRoom(room: OnlineRoom): void {
		const previousState = this.state;
		const previousMoveCount = this.moveHistory.length;

		this.room = room;
		this.timeControl = room.timeControlSettings;
		this.moveHistory = room.moves.map(entry => entry.move);
		this.state = buildGameStateFromMoves(this.moveHistory);

		if (this.selectedSquare !== null) {
			const selectedPiece = this.state.board.get(this.selectedSquare);
			if (!selectedPiece || selectedPiece.color !== this.state.turn || selectedPiece.color !== this.playerSide) {
				this.clearSelection();
			} else {
				this.legalMoves = this.moveFinder.getLegalMoves(this.state.board, this.selectedSquare);
			}
		}

		if (this.pendingPromotionMoves && this.state.turn !== this.playerSide) {
			this.closePromotionDialog();
		}

		if (room.status === 'finished' || this.state.result.type !== 'ongoing') {
			this.showGameOverDialog = true;
		}

		if (this.moveHistory.length > previousMoveCount) {
			const latestMove = this.moveHistory[this.moveHistory.length - 1];
			const wasCapture = Boolean(previousState.board.get(latestMove.to)) || latestMove.enPassant === true;
			const isCheck = AttackedSquares.isKingInCheck(this.state.board, this.state.turn);
			if (this.state.result.type !== 'ongoing') {
				this.soundService.playEnd();
			} else if (isCheck) {
				this.soundService.playCheck();
			} else if (wasCapture) {
				this.soundService.playCapture();
			} else {
				this.soundService.playMove();
			}
		}

		this.requestRender();
	}

	private requestRender(): void {
		this.requestRenderCallback?.();
	}
}
