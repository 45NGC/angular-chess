import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
	selector: 'app-pause-button',
	standalone: true,
	templateUrl: './pause-button.component.html',
	styleUrls: ['./pause-button.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PauseButtonComponent {
	@Input() disabled = false;
	@Output() togglePause = new EventEmitter<void>();
}