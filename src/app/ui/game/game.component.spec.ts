import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Board } from '../../core/board/board';
import { GameState } from '../../core/rules/game-state';
import { Move } from '../../core/rules/move';
import { IGameService } from '../../interfaces/game-service.interface';
import { OnlineRoom, OnlineRoomSession, RequestOnlineRematchResult } from '../../interfaces/online-room.interface';
import { LocalGameService } from '../../services/local-game.service';
import { OnlineGameService } from '../../services/online-game.service';
import { OnlineRoomService } from '../../services/online-room.service';
import { SoundService } from '../../services/sound.service';
import { GameComponent } from './game.component';

describe('GameComponent', () => {
	const session: OnlineRoomSession = {
		roomCode: 'ROOM42',
		playerId: 'player-1',
		playerSide: 'white'
	};

	function createRoom(config?: Partial<OnlineRoom> & {
		whitePlayerId?: string;
		blackPlayerId?: string;
	}): OnlineRoom {
		return {
			code: 'ROOM42',
			status: config?.status ?? 'ready',
			whitePlayer: {
				id: config?.whitePlayerId ?? 'player-1',
				side: 'white',
				presence: 'connected',
				joinedAt: 1
			},
			blackPlayer: {
				id: config?.blackPlayerId ?? 'player-2',
				side: 'black',
				presence: 'connected',
				joinedAt: 2
			},
			timeControlSettings: config?.timeControlSettings ?? {
				white: { baseMinutes: 5, incrementSeconds: 0 },
				black: { baseMinutes: 5, incrementSeconds: 0 }
			},
			whiteTimeMs: config?.whiteTimeMs ?? 300000,
			blackTimeMs: config?.blackTimeMs ?? 300000,
			activeClockColor: config?.activeClockColor ?? null,
			clockUpdatedAt: config?.clockUpdatedAt ?? null,
			timeoutWinner: config?.timeoutWinner ?? null,
			whiteRequestedRematch: config?.whiteRequestedRematch ?? false,
			blackRequestedRematch: config?.blackRequestedRematch ?? false,
			moves: config?.moves ?? [],
			createdAt: config?.createdAt ?? 1,
			startedAt: config?.startedAt ?? null,
			finishedAt: config?.finishedAt ?? null
		};
	}

	function createSoundService(): SoundService {
		return {
			playMove() { },
			playCapture() { },
			playCheck() { },
			playEnd() { },
			playError() { }
		} as SoundService;
	}

	function createOnlineRoomService(
		room$: BehaviorSubject<OnlineRoom>,
		onRequestRematch?: (code: string, playerId: string) => Observable<RequestOnlineRematchResult>
	): OnlineRoomService {
		return {
			getRoom: () => room$.value,
			watchRoom: () => room$.asObservable(),
			watchConnectionState: () => of('idle'),
			watchConnectionMessage: () => of(null),
			getStoredSession: () => session,
			requestRematch: (code: string, playerId: string) => {
				if (onRequestRematch) {
					return onRequestRematch(code, playerId);
				}
				return of({ ok: true, room: room$.value });
			},
			submitMove: () => of({ ok: true, room: room$.value })
		} as unknown as OnlineRoomService;
	}

	function createStubGameService(overrides: Partial<IGameService> = {}): IGameService {
		return {
			state: overrides.state ?? new GameState(new Board()),
			selectedSquare: overrides.selectedSquare ?? null,
			legalMoves: overrides.legalMoves ?? [],
			showGameOverDialog: overrides.showGameOverDialog ?? false,
			showPromotionDialog: overrides.showPromotionDialog ?? false,
			pendingPromotionMoves: overrides.pendingPromotionMoves ?? null,
			isPaused: overrides.isPaused ?? false,
			moveHistory: overrides.moveHistory ?? [],
			timeControl: overrides.timeControl,
			clockEnabled: overrides.clockEnabled,
			whiteTimeMs: overrides.whiteTimeMs,
			blackTimeMs: overrides.blackTimeMs,
			activeClockColor: overrides.activeClockColor,
			isReviewOnly: overrides.isReviewOnly,
			canUndoMove: overrides.canUndoMove,
			canRedoMove: overrides.canRedoMove,
			undoMove: overrides.undoMove,
			redoMove: overrides.redoMove,
			pause: overrides.pause,
			resume: overrides.resume,
			handleSquareClick: overrides.handleSquareClick ?? (() => { }),
			resetGame: overrides.resetGame ?? (() => { }),
			onPromotionSelected: overrides.onPromotionSelected ?? (() => { }),
			closePromotionDialog: overrides.closePromotionDialog ?? (() => { }),
			closeGameOverDialog: overrides.closeGameOverDialog ?? (() => { }),
			getResultMessage: overrides.getResultMessage ?? (() => ''),
			clearSelection: overrides.clearSelection ?? (() => { }),
			destroy: overrides.destroy,
		};
	}

	function createComponent(options?: {
		gameService?: IGameService | null;
		mode?: 'local' | 'ai' | 'online' | null;
		router?: Router;
		onlineRoomService?: OnlineRoomService;
	}): GameComponent {
		const routeStub = {
			paramMap: of(new Map()),
			queryParamMap: of(new Map())
		} as unknown as ActivatedRoute;
		const routerStub = options?.router ?? ({ navigate: vi.fn() } as unknown as Router);
		const cdrStub = {
			detectChanges() { }
		} as ChangeDetectorRef;
		const component = new GameComponent(
			routeStub,
			routerStub,
			createSoundService(),
			cdrStub,
			options?.onlineRoomService ?? ({} as OnlineRoomService)
		);
		component.mode = options?.mode ?? null;
		component.gameService = options?.gameService ?? null;
		return component;
	}

	function createLocalComponent(): { component: GameComponent; service: LocalGameService } {
		const service = new LocalGameService(createSoundService());
		const component = createComponent({
			gameService: service,
			mode: 'local'
		});
		return { component, service };
	}

	function createOnlineComponent(room$: BehaviorSubject<OnlineRoom>): { component: GameComponent; service: OnlineGameService } {
		const service = new OnlineGameService(createSoundService(), createOnlineRoomService(room$), session);
		const component = createComponent({
			gameService: service,
			mode: 'online'
		});
		(component as any).playerSideBoardOrientation = service.playerSide;
		(component as any).manualBoardOrientation = null;
		return { component, service };
	}

	it('uses the player side by default in online mode until the user rotates the board', () => {
		const room$ = new BehaviorSubject(createRoom());
		const { component, service } = createOnlineComponent(room$);

		expect(component.boardOrientation).toBe('white');

		room$.next(createRoom({
			whitePlayerId: 'player-2',
			blackPlayerId: 'player-1'
		}));

		expect(component.boardOrientation).toBe('black');

		component.toggleBoardOrientation();

		expect(component.boardOrientation).toBe('white');
		service.destroy();
	});

	it('keeps the manual online rotation after the player side changes', () => {
		const room$ = new BehaviorSubject(createRoom());
		const { component, service } = createOnlineComponent(room$);

		component.toggleBoardOrientation();

		expect(component.boardOrientation).toBe('black');

		room$.next(createRoom({
			whitePlayerId: 'player-2',
			blackPlayerId: 'player-1'
		}));

		expect(component.boardOrientation).toBe('black');
		service.destroy();
	});

	it('disables local auto-rotate when the player rotates the board manually', () => {
		const { component, service } = createLocalComponent();
		component.autoRotateBoardLocal = true;

		expect(component.boardOrientation).toBe('white');

		component.toggleBoardOrientation();

		expect(component.autoRotateBoardLocal).toBe(false);
		expect(component.boardOrientation).toBe('black');
		service.destroy();
	});

	it('anchors local auto-rotate to the current turn when enabling it', () => {
		const { component, service } = createLocalComponent();
		(component as any).manualBoardOrientation = 'black';

		component.toggleAutoRotateBoardLocal();

		expect(component.autoRotateBoardLocal).toBe(true);
		expect(component.boardOrientation).toBe('white');
		expect((component as any).manualBoardOrientation).toBe('white');
		service.destroy();
	});

	it('allows dragging the current local side and blocks it when the game is paused', () => {
		const { component, service } = createLocalComponent();

		expect(component.canDragSquare(1, 0)).toBe(true);
		expect(component.canDragSquare(6, 0)).toBe(false);

		service.pause();

		expect(component.canDragSquare(1, 0)).toBe(false);
		service.destroy();
	});

	it('distinguishes capture, non-capture, and en passant targets from legal moves', () => {
		const { component, service } = createLocalComponent();
		const legalMoves: Move[] = [
			{ from: 12, to: 20 },
			{ from: 12, to: 28 },
			{ from: 12, to: 21, enPassant: true }
		];

		service.legalMoves = legalMoves;
		service.state.board.set(20, { type: 'knight', color: 'black' });

		expect(component.isCaptureSquare(20)).toBe(true);
		expect(component.isNonCaptureLegalSquare(20)).toBe(false);
		expect(component.isNonCaptureLegalSquare(28)).toBe(true);
		expect(component.isCaptureSquare(21)).toBe(true);
		service.destroy();
	});

	it('blocks undo and redo while modal interaction state is active', () => {
		const undoMove = vi.fn();
		const redoMove = vi.fn();
		const service = createStubGameService({
			isPaused: true,
			undoMove,
			redoMove
		});
		const component = createComponent({
			gameService: service
		});

		component.undoMove();
		component.redoMove();

		expect(undoMove).not.toHaveBeenCalled();
		expect(redoMove).not.toHaveBeenCalled();
	});

	it('delegates undo and redo when move navigation is enabled', () => {
		const undoMove = vi.fn();
		const redoMove = vi.fn();
		const service = createStubGameService({
			undoMove,
			redoMove
		});
		const component = createComponent({
			gameService: service
		});

		component.undoMove();
		component.redoMove();

		expect(undoMove).toHaveBeenCalledOnce();
		expect(redoMove).toHaveBeenCalledOnce();
	});

	it('delegates pause and resume only when pause support is enabled', () => {
		const pause = vi.fn(function (this: IGameService) {
			this.isPaused = true;
		});
		const resume = vi.fn(function (this: IGameService) {
			this.isPaused = false;
		});
		const service = createStubGameService({
			pause,
			resume
		});
		const component = createComponent({
			gameService: service
		});

		component.togglePause();
		component.togglePause();

		expect(pause).toHaveBeenCalledOnce();
		expect(resume).toHaveBeenCalledOnce();
	});

	it('clears the current selection only when clicking outside the game area', () => {
		const clearSelection = vi.fn();
		const service = createStubGameService({
			selectedSquare: 12,
			clearSelection
		});
		const component = createComponent({
			gameService: service
		});
		const board = document.createElement('div');
		board.className = 'board';
		const boardChild = document.createElement('div');
		board.appendChild(boardChild);

		component.onDocumentClick({ target: boardChild } as unknown as MouseEvent);
		component.onDocumentClick({ target: document.createElement('div') } as unknown as MouseEvent);

		expect(clearSelection).toHaveBeenCalledOnce();
	});

	it('closes the dialog and returns home when exiting the game over flow', () => {
		const closeGameOverDialog = vi.fn();
		const router = {
			navigate: vi.fn()
		} as unknown as Router;
		const service = createStubGameService({
			closeGameOverDialog
		});
		const component = createComponent({
			gameService: service,
			router
		});

		component.onExit();

		expect(closeGameOverDialog).toHaveBeenCalledOnce();
		expect(router.navigate).toHaveBeenCalledWith(['/']);
	});
});
