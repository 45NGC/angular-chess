import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
	JoinOnlineRoomResult,
	OnlineRoom,
	OnlineRoomPlayer,
	OnlineRoomSession,
	OnlineRoomSide
} from '../interfaces/online-room.interface';
import { TimeControl } from '../interfaces/time-control.interface';
import { OnlineRoomCodeService } from './online-room-code.service';

@Injectable({
	providedIn: 'root'
})
export class OnlineRoomService {
	private readonly rooms = new Map<string, BehaviorSubject<OnlineRoom>>();

	constructor(private roomCodeService: OnlineRoomCodeService) { }

	createRoom(timeControlSettings: TimeControl): { room: OnlineRoom; session: OnlineRoomSession } {
		const code = this.generateUniqueRoomCode();
		const playerSide = this.resolveCreatorSide();
		const player = this.createPlayer(playerSide);
		const room: OnlineRoom = {
			code,
			status: 'waiting',
			whitePlayer: playerSide === 'white' ? player : null,
			blackPlayer: playerSide === 'black' ? player : null,
			timeControlSettings,
			moves: [],
			createdAt: Date.now(),
			startedAt: null,
			finishedAt: null
		};

		this.rooms.set(code, new BehaviorSubject(room));

		return {
			room,
			session: {
				roomCode: code,
				playerId: player.id,
				playerSide
			}
		};
	}

	joinRoom(rawCode: string): JoinOnlineRoomResult {
		const code = this.roomCodeService.normalizeCode(rawCode);
		const room$ = this.rooms.get(code);
		if (!room$) return { ok: false, error: 'notFound' };

		const room = room$.value;
		if (room.status === 'finished') return { ok: false, error: 'finished' };

		const playerSide = this.findAvailableSide(room);
		if (!playerSide) return { ok: false, error: 'full' };

		const player = this.createPlayer(playerSide);
		const updatedRoom: OnlineRoom = {
			...room,
			status: 'ready',
			whitePlayer: playerSide === 'white' ? player : room.whitePlayer,
			blackPlayer: playerSide === 'black' ? player : room.blackPlayer
		};

		room$.next(updatedRoom);

		return {
			ok: true,
			room: updatedRoom,
			session: {
				roomCode: code,
				playerId: player.id,
				playerSide
			}
		};
	}

	watchRoom(rawCode: string): Observable<OnlineRoom | null> {
		const code = this.roomCodeService.normalizeCode(rawCode);
		const room$ = this.rooms.get(code);
		return room$?.asObservable() ?? of(null);
	}

	private generateUniqueRoomCode(): string {
		for (let attempt = 0; attempt < 25; attempt++) {
			const code = this.roomCodeService.generateCode();
			if (!this.rooms.has(code)) return code;
		}
		throw new Error('Could not generate a unique online room code.');
	}

	private resolveCreatorSide(): OnlineRoomSide {
		return Math.random() < 0.5 ? 'white' : 'black';
	}

	private createPlayer(side: OnlineRoomSide): OnlineRoomPlayer {
		return {
			id: this.generatePlayerId(),
			side,
			presence: 'connected',
			joinedAt: Date.now()
		};
	}

	private findAvailableSide(room: OnlineRoom): OnlineRoomSide | null {
		if (!room.whitePlayer) return 'white';
		if (!room.blackPlayer) return 'black';
		return null;
	}

	private generatePlayerId(): string {
		return `player_${Math.random().toString(36).slice(2, 10)}`;
	}
}
