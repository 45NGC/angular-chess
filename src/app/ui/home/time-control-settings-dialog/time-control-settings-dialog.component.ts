import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SideTimeControl, TimeControl } from '../../../interfaces/time-control.interface';

type BaseTimeOption = { minutes: number; label: string };
type IncrementOption = { seconds: number; label: string };

@Component({
	selector: 'app-time-control-settings-dialog',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './time-control-settings-dialog.component.html',
	styleUrls: ['./time-control-settings-dialog.component.css']
})
export class TimeControlSettingsDialogComponent {
	@Output() confirm = new EventEmitter<TimeControl>();
	@Output() cancel = new EventEmitter<void>();

	private _initial: TimeControl = {
		white: { baseMinutes: 5, incrementSeconds: 0 },
		black: { baseMinutes: 5, incrementSeconds: 0 }
	};
	@Input({ required: true }) set initial(value: TimeControl) {
		this._initial = value;
		this.white = { ...value.white };
		this.black = { ...value.black };
	}
	get initial(): TimeControl { return this._initial; }

	baseOptions: BaseTimeOption[] = [
		{ minutes: 1, label: '1 Minute' },
		{ minutes: 2, label: '2 Minutes' },
		{ minutes: 3, label: '3 Minutes' },
		{ minutes: 5, label: '5 Minutes' },
		{ minutes: 10, label: '10 Minutes' },
		{ minutes: 15, label: '15 Minutes' },
		{ minutes: 20, label: '20 Minutes' },
		{ minutes: 30, label: '30 Minutes' },
		{ minutes: 0, label: 'Unlimited' }
	];

	incrementOptions: IncrementOption[] = [
		{ seconds: 0, label: '+0s' },
		{ seconds: 1, label: '+1s' },
		{ seconds: 2, label: '+2s' },
		{ seconds: 3, label: '+3s' },
		{ seconds: 5, label: '+5s' },
		{ seconds: 10, label: '+10s' },
		{ seconds: 15, label: '+15s' },
		{ seconds: 20, label: '+20s' }
	];

	white: SideTimeControl = { ...this._initial.white };
	black: SideTimeControl = { ...this._initial.black };

	selectBase(side: 'white' | 'black', minutes: number): void {
		if (side === 'white') this.white.baseMinutes = minutes;
		else this.black.baseMinutes = minutes;
	}

	selectIncrement(side: 'white' | 'black', seconds: number): void {
		if (side === 'white') this.white.incrementSeconds = seconds;
		else this.black.incrementSeconds = seconds;
	}

	get summary(): string {
		const whiteBase = this.white.baseMinutes === 0 ? 'Unlimited' : `${this.white.baseMinutes} min`;
		const blackBase = this.black.baseMinutes === 0 ? 'Unlimited' : `${this.black.baseMinutes} min`;
		return `White: ${whiteBase} +${this.white.incrementSeconds}s • Black: ${blackBase} +${this.black.incrementSeconds}s`;
	}

	onConfirm(): void {
		const settings: TimeControl = {
			white: { ...this.white },
			black: { ...this.black }
		};
		this.confirm.emit(settings);
	}

	onCancel(): void {
		this.cancel.emit();
	}
}
