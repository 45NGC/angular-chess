import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LocalGameSettingsDialogComponent } from './local-game-settings-dialog/local-game-settings-dialog.component';
import { TimeControl } from '../../interfaces/time-control.interface';
import { AiModeSettingsDialogComponent } from './ai-mode-settings-dialog/ai-mode-settings-dialog.component';
import { AiModeSettings } from '../../interfaces/ai-mode.interface';
import { OnlineGameSettings } from '../../interfaces/online-game-settings.interface';
import { OnlineLobbyDialogComponent } from './online-lobby-dialog/online-lobby-dialog.component';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [CommonModule, LocalGameSettingsDialogComponent, AiModeSettingsDialogComponent, OnlineLobbyDialogComponent],
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
	lastOnlineGameSettings: OnlineGameSettings = {
		timeControlSettings: {
			white: { baseMinutes: 5, incrementSeconds: 0 },
			black: { baseMinutes: 5, incrementSeconds: 0 }
		},
		hostSidePreference: 'random'
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
				baseTimeWhite: settings.white.baseMinutes,
				incrementWhite: settings.white.incrementSeconds,
				baseTimeBlack: settings.black.baseMinutes,
				incrementBlack: settings.black.incrementSeconds
			}
		});
	}

	onTimeControlCancel(): void {
		this.showTimeControlDialog = false;
	}

	onOnlineLobbyClose(): void {
		this.showOnlineLobbyDialog = false;
	}

	onOnlineSettingsChange(settings: OnlineGameSettings): void {
		this.lastOnlineGameSettings = settings;
		this.lastTimeControl = settings.timeControlSettings;
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
