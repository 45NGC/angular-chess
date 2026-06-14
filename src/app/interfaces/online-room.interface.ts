import { Move } from '../core/rules/move';
import { TimeControl } from './time-control.interface';

export type OnlineRoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export type OnlineRoomSide = 'white' | 'black';

export type OnlinePlayerPresence = 'connected' | 'disconnected';

export interface OnlineRoomPlayer {
	id: string;
	side: OnlineRoomSide;
	presence: OnlinePlayerPresence;
	joinedAt: number;
}

export interface OnlineMoveRecord {
	move: Move;
	playedBy: OnlineRoomSide;
	playedAt: number;
}

export interface OnlineRoom {
	code: string;
	status: OnlineRoomStatus;
	whitePlayer: OnlineRoomPlayer | null;
	blackPlayer: OnlineRoomPlayer | null;
	timeControlSettings: TimeControl;
	moves: OnlineMoveRecord[];
	createdAt: number;
	startedAt: number | null;
	finishedAt: number | null;
}

export interface OnlineRoomSession {
	roomCode: string;
	playerId: string;
	playerSide: OnlineRoomSide;
}

export type JoinOnlineRoomError = 'notFound' | 'full' | 'finished';

export type JoinOnlineRoomResult =
	| { ok: true; room: OnlineRoom; session: OnlineRoomSession }
	| { ok: false; error: JoinOnlineRoomError };

export type SubmitOnlineMoveError = 'notFound' | 'notParticipant' | 'notYourTurn' | 'finished';

export type SubmitOnlineMoveResult =
	| { ok: true; room: OnlineRoom }
	| { ok: false; error: SubmitOnlineMoveError };
