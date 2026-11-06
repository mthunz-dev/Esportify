export interface GameConfig {
    id: string;
    displayName: string;
    minPlayers: number;
    maxPlayers: number;
    aiPrompt: string;
    mock: { [key: string]: { max: number; min: number } };
}
