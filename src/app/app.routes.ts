import { Routes } from '@angular/router';
import { HomeComponent } from './ui/home/home.component';
import { GameComponent } from './ui/game/game.component';

export const routes: Routes = [
	{
		path: '',
		component: HomeComponent,
	},
	{
		path: 'game',
		component: GameComponent,
	},
	{
		path: '**',
		redirectTo: '',
	},
];
