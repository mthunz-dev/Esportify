import { type GameConfig } from "./GameConfig";

export const ValorantConfig: GameConfig = {
    id: "valorant",
    displayName: "VALORANT",
    minPlayers: 5,
    maxPlayers: 7,
    aiPrompt: `Đây là ảnh chụp màn hình bảng điểm (Scoreboard) của tựa game VALORANT.
Đặc điểm nhận diện:
- Có 2 phe: Đội Xanh (Thường ở nửa trên hoặc bên trái) và Đội Đỏ (Nửa dưới hoặc bên phải).
- Điểm số (Score) của mỗi đội là số Ván Thắng (Round Won) - thường là số từ 0 đến 13 (hoặc cao hơn nếu Overtime).
- Tên Ingame (IGN) thường nằm cạnh các Agent (Nhân vật).
Nhiệm vụ: Trích xuất chính xác số Ván Thắng của 2 phe và Mảng chứa toàn bộ Ingame của người chơi từng phe.`,
};
