export type AiDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type PlayerColor = 'white' | 'black' | 'random';

export interface AiModeSettings {
	difficulty: AiDifficulty;
	playerColor: PlayerColor;
}
