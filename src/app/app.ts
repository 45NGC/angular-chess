import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameComponent } from './ui/game/game.component';

@Component({
  selector: 'app-root',
  imports: [GameComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('angular-chess');
}
