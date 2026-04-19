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
	@Input() activeColor: 'white' | 'black' | null = null;
	@Input() clockEnabled = true;
	@Input() whiteInfinite = false;
	@Input() blackInfinite = false;

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