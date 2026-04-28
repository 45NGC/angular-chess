import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TimeControlDialogComponent } from './time-control-dialog/time-control-dialog.component';
import { TimeControl } from '../../interfaces/time-control.interface';
import { AiModeDialogComponent } from './ai-mode-dialog/ai-mode-dialog.component';
import { AiModeSettings } from '../../interfaces/ai-mode.interface';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [CommonModule, TimeControlDialogComponent, AiModeDialogComponent],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.css'],
})
export class HomeComponent {
	constructor(private router: Router) { }

	showTimeControlDialog = false;
	showAiModeDialog = false;
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
		if (mode === 'ai') {
			this.showAiModeDialog = true;
			return;
		}
		this.router.navigate(['/game', mode]);
	}

	onTimeControlConfirm(control: TimeControl): void {
		this.lastTimeControl = control;
		this.showTimeControlDialog = false;
		this.router.navigate(['/game', 'local'], {
			queryParams: {
				baseW: control.white.baseMinutes,
				incW: control.white.incrementSeconds,
				baseB: control.black.baseMinutes,
				incB: control.black.incrementSeconds
			}
		});
	}

	onTimeControlCancel(): void {
		this.showTimeControlDialog = false;
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
