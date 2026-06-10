import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PlayerColor } from '../../../interfaces/ai-mode.interface';
import { OnlineGameSettings } from '../../../interfaces/online-game-settings.interface';
import { TimeControl } from '../../../interfaces/time-control.interface';
import { TimeControlSettingsFormComponent } from '../time-control-settings-form/time-control-settings-form.component';

type ColorOption = { key: PlayerColor; label: string };

@Component({
	selector: 'app-online-game-settings-dialog',
	standalone: true,
	imports: [CommonModule, TimeControlSettingsFormComponent],
	templateUrl: './online-game-settings-dialog.component.html',
	styleUrls: ['./online-game-settings-dialog.component.css']
})
export class OnlineGameSettingsDialogComponent {
	@Output() confirm = new EventEmitter<OnlineGameSettings>();
	@Output() cancel = new EventEmitter<void>();

	private _initial: OnlineGameSettings = {
		timeControlSettings: {
			white: { baseMinutes: 5, incrementSeconds: 0 },
			black: { baseMinutes: 5, incrementSeconds: 0 }
		},
		hostSidePreference: 'random'
	};

	@Input({ required: true }) set initial(value: OnlineGameSettings) {
		this._initial = value;
		this.currentTimeControlSettings = {
			white: { ...value.timeControlSettings.white },
			black: { ...value.timeControlSettings.black }
		};
		this.hostSidePreference = value.hostSidePreference;
	}
	get initial(): OnlineGameSettings { return this._initial; }

	colorOptions: ColorOption[] = [
		{ key: 'white', label: 'WHITE' },
		{ key: 'black', label: 'BLACK' },
		{ key: 'random', label: 'RANDOM' }
	];

	currentTimeControlSettings: TimeControl = {
		white: { ...this._initial.timeControlSettings.white },
		black: { ...this._initial.timeControlSettings.black }
	};
	hostSidePreference: PlayerColor = this._initial.hostSidePreference;

	selectHostSidePreference(color: PlayerColor): void {
		this.hostSidePreference = color;
	}

	onTimeControlSettingsChange(settings: TimeControl): void {
		this.currentTimeControlSettings = settings;
	}

	get hostSideSummary(): string {
		const sideLabel = this.hostSidePreference === 'random' ? 'Random' : this.hostSidePreference === 'white' ? 'White' : 'Black';
		return `Host side: ${sideLabel}`;
	}

	onConfirm(): void {
		const settings: OnlineGameSettings = {
			timeControlSettings: this.currentTimeControlSettings,
			hostSidePreference: this.hostSidePreference
		};
		this.confirm.emit(settings);
	}

	onCancel(): void {
		this.cancel.emit();
	}
}
