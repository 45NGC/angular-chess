import { Move } from '../core/rules/move';
import {
	JoinOnlineRoomError,
	OnlineRoom,
	OnlineRoomSession,
	SubmitOnlineMoveError
} from './online-room.interface';
import { OnlineGameSettings } from './online-game-settings.interface';

export interface CreateOnlineRoomRequest {
	settings: OnlineGameSettings;
}

export interface CreateOnlineRoomResponse {
	room: OnlineRoom;
	session: OnlineRoomSession;
}

export interface JoinOnlineRoomRequest {
	code: string;
}

export type JoinOnlineRoomResponse =
	| {
		ok: true;
		room: OnlineRoom;
		session: OnlineRoomSession;
	}
	| {
		ok: false;
		error: JoinOnlineRoomError;
	};

export interface GetOnlineRoomResponse {
	room: OnlineRoom | null;
}

export interface SubmitOnlineMoveRequest {
	playerId: string;
	move: Move;
}

export type SubmitOnlineMoveResponse =
	| {
		ok: true;
		room: OnlineRoom;
	}
	| {
		ok: false;
		error: SubmitOnlineMoveError;
	};

export type OnlineRoomEventType =
	| 'roomCreated'
	| 'roomUpdated'
	| 'roomReady'
	| 'gameStarted'
	| 'moveSubmitted'
	| 'gameFinished';

export interface OnlineRoomEvent {
	type: OnlineRoomEventType;
	room: OnlineRoom;
}
