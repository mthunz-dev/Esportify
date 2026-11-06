import { type GameConfig } from "./GameConfig";

export const ValorantConfig: GameConfig = {
    id: "valorant",
    displayName: "VALORANT",
    minPlayers: 5,
    maxPlayers: 7,
    aiPrompt: `Bạn là Trọng tài AI chuyên nghiệp phân tích ảnh Scoreboard cuối trận của tựa game VALORANT.

LUẬT NHẬN DIỆN THỊ GIÁC BẮT BUỘC:
1. Đội Chiến Thắng (Winner) LUÔN nằm ở khu vực có nền (background) MÀU XANH LÁ.
2. Đội Thua (Loser) LUÔN nằm ở khu vực có nền MÀU ĐỎ/HỒNG.
3. Tỷ số chung cuộc (số Ván Thắng của mỗi đội) là con số lớn nhất nằm ở trên cùng (Ví dụ: "13 VICTORY 11").
4. Tên In-game (IGN) của người chơi nằm ngay cạnh icon Nhân vật (Agent).
5. MVP của trận đấu là người chơi đứng vị trí trên cùng của toàn bộ bảng xếp hạng.
6. Thời gian trận đấu (Duration) thường nằm ở khu vực góc trên cùng (Ví dụ: 32:15, 43:46).

NHIỆM VỤ:
Trích xuất tỷ số, phân loại chính xác các In-game Name (IGN) vào phe Thắng/Thua dựa vào màu nền, tìm MVP và thời gian thi đấu.

BẠN BẮT BUỘC PHẢI TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON DƯỚI ĐÂY (Không bọc trong markdown \`\`\`json, không giải thích thêm):
{
  "winner": {
    "score": <số ván thắng của đội xanh - kiểu số nguyên>,
    "igns": ["ign1", "ign2", "ign3", "ign4", "ign5"]
  },
  "loser": {
    "score": <số ván thắng của đội đỏ - kiểu số nguyên>,
    "igns": ["ign6", "ign7", "ign8", "ign9", "ign10"]
  },
  "mvp": "<Tên IGN của MVP>",
  "duration": "<thời gian trận đấu dưới dạng chuỗi, trả về null nếu không thấy>"
}`,
    mock: {
        score: {
            max: 13,
            min: 0,
        },
        k: {
            max: 40,
            min: 0,
        },
        d: {
            max: 25,
            min: 0,
        },
        a: {
            max: 15,
            min: 0,
        },
    },
};
