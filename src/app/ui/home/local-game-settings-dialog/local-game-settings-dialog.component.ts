import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeControl } from '../../../interfaces/time-control.interface';
import { TimeControlSettingsFormComponent } from '../time-control-settings-form/time-control-settings-form.component';

@Component({
	selector: 'app-local-game-settings-dialog',
	standalone: true,
	imports: [CommonModule, TimeControlSettingsFormComponent],
	templateUrl: './local-game-settings-dialog.component.html',
	styleUrls: ['./local-game-settings-dialog.component.css']
})
export class LocalGameSettingsDialogComponent {
	@Output() confirm = new EventEmitter<TimeControl>();
	@Output() cancel = new EventEmitter<void>();

	private _initial: TimeControl = {
		white: { baseMinutes: 5, incrementSeconds: 0 },
		black: { baseMinutes: 5, incrementSeconds: 0 }
	};
	@Input({ required: true }) set initial(value: TimeControl) {
		this._initial = value;
		this.currentSettings = {
			white: { ...value.white },
			black: { ...value.black }
		};
	}
	get initial(): TimeControl { return this._initial; }
	currentSettings: TimeControl = {
		white: { ...this._initial.white },
		black: { ...this._initial.black }
	};

	onSettingsChange(settings: TimeControl): void {
		this.currentSettings = settings;
	}

	onConfirm(): void {
		this.confirm.emit(this.currentSettings);
	}

	onCancel(): void {
		this.cancel.emit();
	}
}
