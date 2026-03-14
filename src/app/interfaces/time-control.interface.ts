export interface SideTimeControl {
	/**
	 * Base time in minutes. Use 0 for unlimited.
	 */
	baseMinutes: number;
	/**
	 * Increment (bonus) per move in seconds.
	 */
	incrementSeconds: number;
}

export interface TimeControl {
	white: SideTimeControl;
	black: SideTimeControl;
}
