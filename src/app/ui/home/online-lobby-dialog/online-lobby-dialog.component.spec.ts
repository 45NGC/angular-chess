import '@angular/compiler';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { OnlineRoomCodeService } from '../../../services/online-room-code.service';
import { OnlineRoomService } from '../../../services/online-room.service';
import { OnlineLobbyDialogComponent } from './online-lobby-dialog.component';

describe('OnlineLobbyDialogComponent', () => {
	function createInputEvent(value: string): Event {
		return {
			target: { value }
		} as unknown as Event;
	}

	function createComponent(options?: {
		joinRoom?: OnlineRoomService['joinRoom'];
		detectChanges?: () => void;
	}) {
		const onlineRoomService = {
			watchConnectionState: () => of('idle'),
			watchConnectionMessage: () => of(null),
			createRoom: vi.fn(),
			joinRoom: options?.joinRoom ?? vi.fn(),
			watchRoom: vi.fn()
		} as unknown as OnlineRoomService;

		const detectChanges = options?.detectChanges ?? vi.fn();
		const component = new OnlineLobbyDialogComponent(
			new OnlineRoomCodeService(),
			onlineRoomService,
			{ navigate: vi.fn() } as unknown as Router,
			{ detectChanges } as ChangeDetectorRef
		);

		return { component, detectChanges, onlineRoomService };
	}

	it('does not show room not found while typing', () => {
		const { component } = createComponent();

		component.joinError = 'Previous error';
		component.onJoinCodeInput(createInputEvent('abc123'));

		expect(component.joinCode).toBe('ABC123');
		expect(component.joinError).toBe('');
	});

	it('shows room not found and stops loading after clicking continue', () => {
		const joinRoom = vi.fn(() => of({ ok: false as const, error: 'notFound' as const }));
		const detectChanges = vi.fn();
		const { component } = createComponent({ joinRoom, detectChanges });

		component.joinCode = 'ABC123';
		component.onJoinGame();

		expect(joinRoom).toHaveBeenCalledWith('ABC123');
		expect(component.joinError).toBe('Room not found.');
		expect(component.isSubmitting).toBe(false);
		expect(detectChanges).toHaveBeenCalled();
	});
});
