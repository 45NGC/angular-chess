import { PlayerColor } from './ai-mode.interface';
import { TimeControl } from './time-control.interface';

export interface OnlineGameSettings {
	timeControlSettings: TimeControl;
	hostSidePreference: PlayerColor;
}
