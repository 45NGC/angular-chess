import { HttpClient } from '@angular/common/http';
import { OnlineRoom } from '../interfaces/online-room.interface';
import { OnlineRoomCodeService } from './online-room-code.service';
import { OnlineRoomService } from './online-room.service';

describe('OnlineRoomService', () => {
	const storageKey = 'angular-chess.online-session.ABC123';

	function createRoom(participants: { whiteId: string; blackId: string }): OnlineRoom {
		return {
			code: 'ABC123',
			status: 'ready',
			whitePlayer: {
				id: participants.whiteId,
				side: 'white',
				presence: 'connected',
				joinedAt: 1
			},
			blackPlayer: {
				id: participants.blackId,
				side: 'black',
				presence: 'connected',
				joinedAt: 2
			},
			timeControlSettings: {
				white: { baseMinutes: 5, incrementSeconds: 0 },
				black: { baseMinutes: 5, incrementSeconds: 0 }
			},
			whiteTimeMs: 300000,
			blackTimeMs: 300000,
			activeClockColor: null,
			clockUpdatedAt: null,
			timeoutWinner: null,
			whiteRequestedRematch: false,
			blackRequestedRematch: false,
			moves: [],
			createdAt: 1,
			startedAt: null,
			finishedAt: null
		};
	}

	beforeEach(() => {
		localStorage.clear();
	});

	it('updates the stored player side when the room swaps colors', () => {
		const service = new OnlineRoomService(
			{} as HttpClient,
			{ normalizeCode: (code: string) => code } as OnlineRoomCodeService
		);

		localStorage.setItem(storageKey, JSON.stringify({
			roomCode: 'ABC123',
			playerId: 'player-1',
			playerSide: 'white'
		}));

		(service as any).updateRoom(createRoom({ whiteId: 'player-2', blackId: 'player-1' }));

		expect(service.getStoredSession('ABC123')).toEqual({
			roomCode: 'ABC123',
			playerId: 'player-1',
			playerSide: 'black'
		});
	});
});
