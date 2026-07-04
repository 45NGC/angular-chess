import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import {
	CreateOnlineRoomResponse,
	GetOnlineRoomResponse,
	JoinOnlineRoomRequest,
	JoinOnlineRoomResponse,
	SubmitOnlineMoveRequest,
	SubmitOnlineMoveResponse
} from '../interfaces/online-backend-contract.interface';
import {
	JoinOnlineRoomResult,
	OnlineRoom,
	OnlineRoomSession,
	SubmitOnlineMoveResult
} from '../interfaces/online-room.interface';
import { OnlineGameSettings } from '../interfaces/online-game-settings.interface';
import { OnlineRoomCodeService } from './online-room-code.service';
import { Move } from '../core/rules/move';

interface OnlineRoomUpdateEvent {
	room: OnlineRoom;
}

export type OnlineConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

@Injectable({
	providedIn: 'root'
})
export class OnlineRoomService {
	private static readonly SESSION_STORAGE_PREFIX = 'angular-chess.online-session.';

	private readonly rooms = new Map<string, BehaviorSubject<OnlineRoom | null>>();
	private readonly roomTopics = new Set<string>();
	private readonly topicSubscriptions = new Map<string, StompSubscription>();
	private readonly connectionStateSubject = new BehaviorSubject<OnlineConnectionState>('idle');
	private readonly connectionMessageSubject = new BehaviorSubject<string | null>(null);
	private readonly apiBaseUrl = this.buildApiBaseUrl();
	private readonly webSocketUrl = this.buildWebSocketUrl();

	private stompClient: Client | null = null;
	private connectionPromise: Promise<void> | null = null;

	constructor(
		private http: HttpClient,
		private roomCodeService: OnlineRoomCodeService
	) { }

	createRoom(settings: OnlineGameSettings): Observable<{ room: OnlineRoom; session: OnlineRoomSession }> {
		return this.http.post<CreateOnlineRoomResponse>(`${this.apiBaseUrl}/api/online/rooms`, { settings }).pipe(
			tap(({ room, session }) => {
				this.updateRoom(room);
				this.storeSession(session);
				this.watchRoomTopic(room.code);
			})
		);
	}

	joinRoom(rawCode: string): Observable<JoinOnlineRoomResult> {
		const code = this.roomCodeService.normalizeCode(rawCode);
		const request: JoinOnlineRoomRequest = { code };

		return this.http.post<JoinOnlineRoomResponse>(`${this.apiBaseUrl}/api/online/rooms/${code}/join`, request).pipe(
			tap(result => {
				if (result.ok) {
					this.updateRoom(result.room);
					this.storeSession(result.session);
					this.watchRoomTopic(result.room.code);
				}
			})
		);
	}

	watchRoom(rawCode: string): Observable<OnlineRoom | null> {
		const code = this.roomCodeService.normalizeCode(rawCode);
		const room$ = this.getOrCreateRoomSubject(code);

		this.fetchRoom(code);
		this.watchRoomTopic(code);

		return room$.asObservable();
	}

	getRoom(rawCode: string): OnlineRoom | null {
		const code = this.roomCodeService.normalizeCode(rawCode);
		return this.rooms.get(code)?.value ?? null;
	}

	getStoredSession(rawCode: string): OnlineRoomSession | null {
		const code = this.roomCodeService.normalizeCode(rawCode);
		const rawSession = localStorage.getItem(this.sessionStorageKey(code));
		if (!rawSession) return null;

		try {
			const session = JSON.parse(rawSession) as OnlineRoomSession;
			if (
				session.roomCode !== code
				|| !session.playerId
				|| (session.playerSide !== 'white' && session.playerSide !== 'black')
			) {
				this.clearStoredSession(code);
				return null;
			}
			return session;
		} catch {
			this.clearStoredSession(code);
			return null;
		}
	}

	watchConnectionState(): Observable<OnlineConnectionState> {
		return this.connectionStateSubject.asObservable();
	}

	watchConnectionMessage(): Observable<string | null> {
		return this.connectionMessageSubject.asObservable();
	}

	submitMove(rawCode: string, playerId: string, move: Move): Observable<SubmitOnlineMoveResult> {
		const code = this.roomCodeService.normalizeCode(rawCode);
		const request: SubmitOnlineMoveRequest = { playerId, move };

		return this.http.post<SubmitOnlineMoveResponse>(`${this.apiBaseUrl}/api/online/rooms/${code}/moves`, request).pipe(
			tap(result => {
				if (result.ok) {
					this.updateRoom(result.room);
				}
			})
		);
	}

	private fetchRoom(code: string): void {
		this.http.get<GetOnlineRoomResponse>(`${this.apiBaseUrl}/api/online/rooms/${code}`).subscribe({
			next: response => {
				this.getOrCreateRoomSubject(code).next(response.room);
			},
			error: () => {
				this.getOrCreateRoomSubject(code).next(null);
			}
		});
	}

	private updateRoom(room: OnlineRoom): void {
		this.getOrCreateRoomSubject(room.code).next(room);
	}

	private getOrCreateRoomSubject(code: string): BehaviorSubject<OnlineRoom | null> {
		let room$ = this.rooms.get(code);
		if (!room$) {
			room$ = new BehaviorSubject<OnlineRoom | null>(null);
			this.rooms.set(code, room$);
		}
		return room$;
	}

	private watchRoomTopic(code: string): void {
		this.roomTopics.add(code);
		if (this.stompClient?.connected) {
			this.subscribeToRoomTopic(code);
			return;
		}

		this.connectionStateSubject.next('connecting');
		this.connectionMessageSubject.next('Connecting to live updates...');
		void this.ensureStompConnection()
			.then(() => {
				this.subscribeToRoomTopic(code);
			})
			.catch(() => {
				this.connectionStateSubject.next('disconnected');
				this.connectionMessageSubject.next('Live updates are temporarily unavailable.');
			});
	}

	private ensureStompConnection(): Promise<void> {
		if (this.stompClient?.connected) {
			return Promise.resolve();
		}
		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		this.stompClient ??= new Client({
			brokerURL: this.webSocketUrl,
			reconnectDelay: 5000,
			onConnect: () => {
				this.topicSubscriptions.clear();
				this.connectionStateSubject.next('connected');
				this.connectionMessageSubject.next(null);
				for (const code of this.roomTopics) {
					this.subscribeToRoomTopic(code);
				}
				this.connectionPromise = null;
			},
			onWebSocketClose: () => {
				this.topicSubscriptions.clear();
				if (this.roomTopics.size > 0) {
					this.connectionStateSubject.next('disconnected');
					this.connectionMessageSubject.next('Connection lost. Trying to reconnect...');
				}
			}
		});

		this.connectionPromise = new Promise((resolve, reject) => {
			if (!this.stompClient) {
				reject(new Error('STOMP client could not be created.'));
				return;
			}

			const originalConnect = this.stompClient.onConnect;
			const originalError = this.stompClient.onStompError;
			const originalWebSocketError = this.stompClient.onWebSocketError;

			this.stompClient.onConnect = frame => {
				originalConnect?.(frame);
				resolve();
			};
			this.stompClient.onStompError = frame => {
				originalError?.(frame);
				this.connectionPromise = null;
				this.connectionStateSubject.next('disconnected');
				this.connectionMessageSubject.next('The live update channel returned an error.');
				reject(new Error(frame.headers['message'] ?? 'STOMP connection failed.'));
			};
			this.stompClient.onWebSocketError = event => {
				originalWebSocketError?.(event);
				this.connectionPromise = null;
				this.connectionStateSubject.next('disconnected');
				this.connectionMessageSubject.next('Could not connect to the live update server.');
				reject(new Error('WebSocket connection failed.'));
			};
		});

		this.stompClient.activate();
		return this.connectionPromise;
	}

	private subscribeToRoomTopic(code: string): void {
		if (!this.stompClient?.connected || this.topicSubscriptions.has(code)) {
			return;
		}

		const subscription = this.stompClient.subscribe(
			`/topic/online/rooms/${code}`,
			message => this.handleRoomMessage(code, message)
		);
		this.topicSubscriptions.set(code, subscription);
	}

	private handleRoomMessage(code: string, message: IMessage): void {
		try {
			const payload = JSON.parse(message.body) as OnlineRoomUpdateEvent;
			this.getOrCreateRoomSubject(code).next(payload.room);
		} catch {
			// Ignore malformed frames to keep the room stream alive.
		}
	}

	private buildApiBaseUrl(): string {
		if (typeof window === 'undefined') {
			return 'http://localhost:8080';
		}
		return `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:8080`;
	}

	private buildWebSocketUrl(): string {
		if (typeof window === 'undefined') {
			return 'ws://localhost:8080/ws';
		}
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		return `${protocol}://${window.location.hostname}:8080/ws`;
	}

	private storeSession(session: OnlineRoomSession): void {
		localStorage.setItem(this.sessionStorageKey(session.roomCode), JSON.stringify(session));
	}

	private clearStoredSession(code: string): void {
		localStorage.removeItem(this.sessionStorageKey(code));
	}

	private sessionStorageKey(code: string): string {
		return `${OnlineRoomService.SESSION_STORAGE_PREFIX}${code}`;
	}
}
