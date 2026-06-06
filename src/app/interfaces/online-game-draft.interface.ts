import { TimeControl } from './time-control.interface';

export interface OnlineGameDraft {
	code: string;
	timeControl: TimeControl;
	createdAt: number;
}
