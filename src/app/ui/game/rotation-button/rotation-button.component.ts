import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-rotation-button',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './rotation-button.component.html',
	styleUrls: ['./rotation-button.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RotationButtonComponent {
	@Input({ required: true }) orientation!: 'white' | 'black';
	@Input() autoRotateVisible = false;
	@Input() autoRotateEnabled = false;

	@Output() rotate = new EventEmitter<void>();
	@Output() toggleAutoRotate = new EventEmitter<void>();
}

