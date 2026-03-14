import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TimeControlDialogComponent } from './time-control-dialog/time-control-dialog.component';
import { TimeControl } from '../../interfaces/time-control.interface';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [CommonModule, TimeControlDialogComponent],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.css'],
})
export class HomeComponent {
	constructor(private router: Router) { }

	showTimeControlDialog = false;
	lastTimeControl: TimeControl = {
		white: { baseMinutes: 5, incrementSeconds: 0 },
		black: { baseMinutes: 5, incrementSeconds: 0 }
	};

	play(mode: string): void {
		if (mode === 'local') {
			this.showTimeControlDialog = true;
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
}
