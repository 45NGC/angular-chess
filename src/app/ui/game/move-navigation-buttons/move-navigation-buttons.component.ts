import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-move-navigation-buttons',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './move-navigation-buttons.component.html',
	styleUrls: ['./move-navigation-buttons.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveNavigationButtonsComponent {
	@Input() canUndo = false;
	@Input() canRedo = false;
	@Input() disabled = false;

	@Output() undo = new EventEmitter<void>();
	@Output() redo = new EventEmitter<void>();
}

