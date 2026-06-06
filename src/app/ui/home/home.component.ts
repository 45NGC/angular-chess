import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TimeControlSettingsDialogComponent } from './time-control-settings-dialog/time-control-settings-dialog.component';
import { TimeControl } from '../../interfaces/time-control.interface';
import { AiModeSettingsDialogComponent } from './ai-mode-settings-dialog/ai-mode-settings-dialog.component';
import { AiModeSettings } from '../../interfaces/ai-mode.interface';
import { OnlineLobbyDialogComponent } from './online-lobby-dialog/online-lobby-dialog.component';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [CommonModule, TimeControlSettingsDialogComponent, AiModeSettingsDialogComponent, OnlineLobbyDialogComponent],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.css'],
})
export class HomeComponent {
	constructor(private router: Router) { }

	showTimeControlDialog = false;
	showAiModeDialog = false;
	showOnlineLobbyDialog = false;
	lastTimeControl: TimeControl = {
		white: { baseMinutes: 5, incrementSeconds: 0 },
		black: { baseMinutes: 5, incrementSeconds: 0 }
	};
	lastAiMode: AiModeSettings = {
		difficulty: 'beginner',
		playerColor: 'random'
	};

	play(mode: string): void {
		if (mode === 'local') {
			this.showTimeControlDialog = true;
			return;
		}
		if (mode === 'online') {
			this.showOnlineLobbyDialog = true;
			return;
		}
		if (mode === 'ai') {
			this.showAiModeDialog = true;
			return;
		}
		this.router.navigate(['/game', mode]);
	}

	onTimeControlConfirm(settings: TimeControl): void {
		this.lastTimeControl = settings;
		this.showTimeControlDialog = false;
		this.router.navigate(['/game', 'local'], {
			queryParams: {
				baseW: settings.white.baseMinutes,
				incW: settings.white.incrementSeconds,
				baseB: settings.black.baseMinutes,
				incB: settings.black.incrementSeconds
			}
		});
	}

	onTimeControlCancel(): void {
		this.showTimeControlDialog = false;
	}

	onOnlineLobbyClose(): void {
		this.showOnlineLobbyDialog = false;
	}

	onOnlineTimeControlChange(settings: TimeControl): void {
		this.lastTimeControl = settings;
	}

	onAiModeConfirm(settings: AiModeSettings): void {
		this.lastAiMode = settings;
		this.showAiModeDialog = false;
		this.router.navigate(['/game', 'ai'], {
			queryParams: {
				difficulty: settings.difficulty,
				color: settings.playerColor
			}
		});
	}

	onAiModeCancel(): void {
		this.showAiModeDialog = false;
	}
}
