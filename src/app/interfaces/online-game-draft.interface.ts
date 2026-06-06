import { TimeControl } from './time-control.interface';

export interface OnlineGameDraft {
	code: string;
	timeControlSettings: TimeControl;
	createdAt: number;
}
