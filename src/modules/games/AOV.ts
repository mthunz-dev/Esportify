import { type GameConfig } from "./GameConfig";

export const AOVConfig: GameConfig = {
    id: "aov",
    displayName: "Liên Quân Mobile",
    minPlayers: 5,
    maxPlayers: 7,
    aiPrompt: `Bạn là Trọng tài AI chuyên nghiệp phân tích ảnh Bảng điểm (Scoreboard) cuối trận của tựa game Liên Quân Mobile (Arena of Valor).

LUẬT NHẬN DIỆN THỊ GIÁC BẮT BUỘC:
1. Xác định Đội Thắng/Thua qua Logo MVP:
   - Đội Chiến Thắng (Winner) LUÔN là phe có người chơi sở hữu huy hiệu "MVP" MÀU VÀNG / CAM.
   - Đội Thua (Loser) LUÔN là phe có người chơi sở hữu huy hiệu "MVP" MÀU TÍM / BẠC.
2. Tỷ số ván đấu (Tổng số mạng hạ gục): Là 2 con số to nhất nằm ở vị trí trên cùng chính giữa màn hình (Ví dụ: 15 và 9). Phải đối chiếu đúng điểm bên Trái/Phải thuộc về phe Trái/Phải tương ứng.
3. Tên In-game (IGN) của người chơi nằm bên cạnh Avatar tướng và bộ chỉ số KDA.
4. MVP của trận đấu chính là tên In-game của người chơi sở hữu huy hiệu MVP MÀU VÀNG / CAM.
5. Thời gian thi đấu (Duration) thường rất nhỏ ở góc trên cùng (hoặc góc dưới), nếu không nhìn thấy rõ hãy trả về null.

NHIỆM VỤ:
Trích xuất tỷ số (mạng hạ gục), phân loại chính xác các In-game Name (IGN) vào phe Thắng/Thua dựa vào màu sắc của logo MVP, tìm tên người chơi MVP Thắng và thời gian thi đấu.

BẠN BẮT BUỘC PHẢI TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON DƯỚI ĐÂY (Không bọc trong markdown \`\`\`json, không giải thích thêm):
{
  "winner": {
    "score": <tổng số mạng hạ gục của đội thắng - kiểu số nguyên>,
    "igns": ["ign1", "ign2", "ign3", "ign4", "ign5"]
  },
  "loser": {
    "score": <tổng số mạng hạ gục của đội thua - kiểu số nguyên>,
    "igns": ["ign6", "ign7", "ign8", "ign9", "ign10"]
  },
  "mvp": "<Tên IGN của người chơi đạt MVP màu Vàng>",
  "duration": "<thời gian trận đấu dưới dạng chuỗi, trả về null nếu không thấy>"
}`,
    mock: {
        score: {
            max: 30,
            min: 0,
        },
        k: {
            max: 20,
            min: 0,
        },
        d: {
            max: 10,
            min: 0,
        },
        a: {
            max: 10,
            min: 0,
        },
    },
};
