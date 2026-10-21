import { type GameConfig } from "./GameConfig";
import { ValorantConfig } from "./VALORANT";
// Thêm import các game khác vào đây sau này (vd: import { LolConfig } from "./lol")

export const SupportedGames: GameConfig[] = [ValorantConfig];

// Hàm tiện ích để lấy cấu hình game từ ID
export const getGameConfig = (id: string): GameConfig | undefined => {
    return SupportedGames.find((game) => game.id === id);
};
