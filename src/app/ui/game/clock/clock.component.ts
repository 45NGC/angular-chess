import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatTime, formatTimeFraction } from '../../../core/time/time.utils';

@Component({
	selector: 'app-clock',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './clock.component.html',
	styleUrls: ['./clock.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClockComponent {
	@Input({ required: true }) whiteTimeMs!: number;
	@Input({ required: true }) blackTimeMs!: number;
	@Input({ required: true }) whiteIncrementSec!: number;
	@Input({ required: true }) blackIncrementSec!: number;
	@Input() bottomColor: 'white' | 'black' = 'white';
	@Input() activeColor: 'white' | 'black' | null = null;
	@Input() clockEnabled = true;
	@Input() whiteInfinite = false;
	@Input() blackInfinite = false;

	get topColor(): 'white' | 'black' {
		return this.bottomColor === 'white' ? 'black' : 'white';
	}

	get topIncrementSec(): number {
		return this.topColor === 'white' ? this.whiteIncrementSec : this.blackIncrementSec;
	}

	get bottomIncrementSec(): number {
		return this.bottomColor === 'white' ? this.whiteIncrementSec : this.blackIncrementSec;
	}

	formatMain(color: 'white' | 'black'): string {
		if (color === 'white' && this.whiteInfinite) return '∞';
		if (color === 'black' && this.blackInfinite) return '∞';
		const ms = color === 'white' ? this.whiteTimeMs : this.blackTimeMs;
		return formatTime(ms);
	}

	formatFraction(color: 'white' | 'black'): string | null {
		if (color === 'white' && this.whiteInfinite) return null;
		if (color === 'black' && this.blackInfinite) return null;
		const ms = color === 'white' ? this.whiteTimeMs : this.blackTimeMs;
		return formatTimeFraction(ms);
	}
}
