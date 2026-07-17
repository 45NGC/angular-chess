import { BehaviorSubject, Observable, of } from 'rxjs';
import { OnlineRoom, OnlineRoomSession, RequestOnlineRematchResult } from '../interfaces/online-room.interface';
import { OnlineGameService } from './online-game.service';
import { OnlineRoomService } from './online-room.service';
import { SoundService } from './sound.service';

describe('OnlineGameService', () => {
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
			requestRematch: (code: string, playerId: string) => {
				if (onRequestRematch) {
					return onRequestRematch(code, playerId);
				}
				return of({ ok: true, room: room$.value });
			},
			submitMove: () => of({ ok: true, room: room$.value })
		} as unknown as OnlineRoomService;
	}

	it('requests a backend rematch with the current session player', () => {
		const finishedRoom = createRoom({ status: 'finished', finishedAt: 10 });
		const room$ = new BehaviorSubject(finishedRoom);
		const requests: Array<{ code: string; playerId: string }> = [];
		const service = new OnlineGameService(
			createSoundService(),
			createOnlineRoomService(room$, (code, playerId) => {
				requests.push({ code, playerId });
				return of({ ok: true, room: finishedRoom });
			}),
			session
		);

		service.resetGame();

		expect(requests).toEqual([{ code: 'ROOM42', playerId: 'player-1' }]);
		service.destroy();
	});

	it('rebuilds the game from the rematch room update and swaps the player side', () => {
		const finishedRoom = createRoom({
			status: 'finished',
			finishedAt: 10,
			blackRequestedRematch: true
		});
		const room$ = new BehaviorSubject(finishedRoom);
		const service = new OnlineGameService(
			createSoundService(),
			createOnlineRoomService(room$),
			session
		);

		expect(service.showGameOverDialog).toBe(true);
		expect(service.rematchStatusMessage).toBe('Your opponent requested a rematch.');
		expect(service.rematchActionLabel).toBe('ACCEPT REMATCH');

		room$.next(createRoom({
			status: 'ready',
			whitePlayerId: 'player-2',
			blackPlayerId: 'player-1',
			whiteRequestedRematch: false,
			blackRequestedRematch: false,
			finishedAt: null,
			startedAt: null
		}));

		expect(service.playerSide).toBe('black');
		expect(service.showGameOverDialog).toBe(false);
		expect(service.moveHistory).toEqual([]);
		expect(service.state.turn).toBe('white');
		expect(service.whiteTimeMs).toBe(300000);
		expect(service.blackTimeMs).toBe(300000);
		service.destroy();
	});
});
