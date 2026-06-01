import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
	selector: 'app-restart-button',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './restart-button.component.html',
	styleUrls: ['./restart-button.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestartButtonComponent {
	@Input() disabled = false;
	@Input() label = 'RESTART';

	@Output() restart = new EventEmitter<void>();
}
