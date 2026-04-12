import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-ai-mode-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-mode-dialog.component.html',
  styleUrls: ['./ai-mode-dialog.component.css']
})
export class AiModeDialogComponent {
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  levels = [
    { key: 'beginner', label: 'Beginner (~800)' },
    { key: 'intermediate', label: 'Intermediate (~1200)' },
    { key: 'advanced', label: 'Advanced (~1600)' },
    { key: 'expert', label: 'Expert (~2000)' }
  ];

  colors = [
    { key: 'white', label: 'WHITE' },
    { key: 'black', label: 'BLACK' },
    { key: 'random', label: 'RANDOM' }
  ];

  selectedLevel = 'beginner';
  selectedColor = 'random';

  selectLevel(level: string) {
    this.selectedLevel = level;
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  getSelectedLevelLabel() {
    return this.levels.find(l => l.key === this.selectedLevel)?.label;
  }

  onConfirm(): void {
    this.confirm.emit();
  }
  onCancel(): void {
    this.cancel.emit();
  }
}