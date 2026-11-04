import Groq from "groq-sdk";
import { type GameConfig } from "@/modules/games/GameConfig";
const GROQ_MODEL = "qwen/qwen3.8-27b";

const groq = new Groq();

export interface RosterSafetyResult {
    isTeamNameToxic: boolean;
    toxicPlayers: string[];
}
export interface TournamentFormatSuggestionResult {
    label: string;
    formatType: "SINGLE_ELIMINATION" | "GROUP_STAGE";
    groupCount: number;
    advancePerGroup: number;
    description: string;
}
export interface analyzedMatchResult {
    teamAScore: number;
    teamBScore: number;
    teamAPlayers: string[];
    teamBPlayers: string[];
    mvpIngame?: string;
    duration?: number;
}

export class AiService {
    static async suggestTournamentFormat(teamCount: number) {
        try {
            const validGroups: number[] = [];
            for (let g = 2; g <= Math.floor(teamCount / 3); g++) {
                if (teamCount % g === 0) {
                    validGroups.push(g);
                }
            }

            const groupWhitelist =
                validGroups.length > 0
                    ? `[${validGroups.join(", ")}]`
                    : "KHÔNG CÓ CÁCH CHIA BẢNG HỢP LỆ";

            const jsonSchemaPrompt = `
BẠN CHỈ ĐƯỢC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU, KHÔNG GIẢI THÍCH THÊM:
{
  "suggestions": [
    {
      "label": "Tên phương án ngắn gọn, BẮT BUỘC ghi rõ số đội đi tiếp nếu có chia bảng (VD: 8 Bảng x 4 Đội (Lấy Top 2) | VD: Loại trực tiếp 32 đội)",
      "formatType": "<Chỉ được điền 'GROUP_STAGE' hoặc 'SINGLE_ELIMINATION'>",
      "groupCount": <SỐ NGUYÊN DƯƠNG - Số lượng bảng đấu. Điền 0 nếu là SINGLE_ELIMINATION>,
      "advancePerGroup": <SỐ NGUYÊN DƯƠNG - Số đội đi tiếp ở mỗi bảng. Điền 0 nếu là SINGLE_ELIMINATION>,
      "description": "<ĐÚNG 1 CÂU, TỐI ĐA 15 TỪ ĐÚNG 1 CÂU, TỐI ĐA 15 TỪ. Giải thích nhanh lý do chọn. VD: 'Thích hợp cho giải đánh nhanh thắng nhanh', 'Cân bằng giữa cọ xát và thời gian'>."
    }
  ]
}
`;
            const finalPrompt =
                `
Giải đấu hiện có chính xác ${teamCount} đội đăng ký.
Nhiệm vụ của bạn là đưa ra TỐI ĐA 3 phương án tổ chức (format) hợp lý nhất để tìm ra nhà vô địch, dựa trên số lượng đội này.

RÀNG BUỘC TỐI THƯỢNG:
1. NGUYÊN TẮC CHIA BẢNG (GROUP_STAGE):
    - DANH SÁCH SỐ BẢNG ĐƯỢC PHÉP CHỌN: ${groupWhitelist}.
    - NẾU DANH SÁCH TRÊN CÓ CHỮ "KHÔNG CÓ", BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC TẠO FORMAT GROUP_STAGE.
    - NẾU CÓ CHỌN GROUP_STAGE, giá trị "groupCount" BẮT BUỘC PHẢI LÀ 1 SỐ NẰM TRONG DANH SÁCH TRÊN. (Không được chọn số khác).
    - SỐ ĐỘI TRONG MỘT BẢNG NÊN <= 8 để tránh giải đấu bị kéo dài.
    - Số đội đi tiếp của toàn giải (advancePerGroup * groupCount) phải là một lũy thừa của 2 (VD: 4, 8, 16, 32).
    - Số Bảng (groupCount) ưu tiên các số: 2, 4, 8, 16.
2. NGUYÊN TẮC LOẠI TRỰC TIẾP (SINGLE_ELIMINATION):
    - NẾU số lượng đội (${teamCount}) là một lũy thừa của 2 (như 8, 16, 32, 64): BẠN BẮT BUỘC phải đề xuất ít nhất một phương án là "Loại trực tiếp toàn giải" (Không có vòng bảng, tiến thẳng vào nhánh đấu Vòng 1/8 hoặc Vòng 1/16).
    - NẾU số lượng đội (${teamCount}) KHÔNG PHẢI là lũy thừa của 2 (ví dụ: 10, 24, 40...), BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC đề xuất formatType là SINGLE_ELIMINATION. Bắt buộc toàn bộ các option phải dùng GROUP_STAGE.
3. ĐA DẠNG HÓA: Hãy cố gắng đưa ra cả phương án đánh nhanh (ít bảng, loại trực tiếp) và phương án cọ xát nhiều (nhiều bảng, vòng tròn) để Ban tổ chức chọn.
4. SỐ LƯỢNG PHƯƠNG ÁN TRẢ VỀ: Nếu số lượng đội quá ít khiến toán học không cho phép tạo ra nhiều phương án hợp lệ, việc trả về 1 hoặc 2 phương án là HOÀN TOÀN HỢP LỆ. KHÔNG ĐƯỢC bịa ra phương án vi phạm các luật trên chỉ để cho đủ số lượng.
` +
                "\n" +
                jsonSchemaPrompt;

            const response = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: "system",
                        content:
                            "Bạn là Chuyên gia Thiết kế Giải đấu Thể thao Điện tử (Esports).",
                    },
                    {
                        role: "user",
                        content: finalPrompt,
                    },
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error("API không trả về nội dung");

            return JSON.parse(content) as {
                suggestions: TournamentFormatSuggestionResult[];
            };
        } catch (error) {
            console.error("Lỗi AI Service (Suggest Tournament Format):", error);
            return null;
        }
    }

    static async analyzeMatchImage(
        imageUrl: string,
        mimeType: string,
        gameConfig: GameConfig,
    ) {
        try {
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString("base64");

            const jsonSchemaPrompt = `
Bạn BẮT BUỘC trả về kết quả bằng chuẩn JSON theo cấu trúc sau và không giải thích gì thêm:
{
  "teamAScore": <number - Điểm số hoặc số round thắng của đội A>,
  "teamBScore": <number - Điểm số hoặc số round thắng của đội B>,
  "teamAPlayers": [<string array - Danh sách tên ingame (IGN) của người chơi team A>],
  "teamBPlayers": [<string array - Danh sách tên ingame (IGN) của người chơi team B>],
  "mvpIngame": <string - ingame của MVP trận đấu>,
  "duration": <number - Thời gian diễn ra trận đấu bằng giây>
}`;
            const finalPrompt = `\n${gameConfig.aiPrompt}\n${jsonSchemaPrompt}`;

            const response = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "Bạn là trọng tài eSports cấp cao.",
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: finalPrompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error("API không trả về nội dung");

            return JSON.parse(content) as analyzedMatchResult;
        } catch (error) {
            console.error("Lỗi AI Service (Analyze Image):", error);
            return null;
        }
    }

    static async validateRosterSafety(
        teamName: string,
        players: string[],
    ): Promise<RosterSafetyResult> {
        try {
            const systemInstruction = `Bạn là hệ thống kiểm duyệt gắt gao của một giải đấu Thể thao Điện tử tại Việt Nam.
Nhiệm vụ của bạn là kiểm tra Tên đội và Tên người chơi để phát hiện các từ ngữ thô tục, vi phạm thuần phong mỹ tục.

CHÚ Ý ĐẶC BIỆT CÁC KIỂU LÁCH LUẬT CỦA GAME THỦ VIỆT NAM:
1. Từ không dấu: "concac", "ditme", "lon", "buoi", "cac", "loz", "cc", "vl", "vcl", "clgt".
2. Chèn ký tự/Số: "c.o.n.c.a.c", "d!t", "l0n", "vloz", "dmm", "dkm".
3. Đọc lái/Nói bậy: "2 hon dai", "hai hon dai", "dau buoi", "mat day".
4. Tiếng Anh thô tục: "fuck", "shit", "bitch", "cunt", "dick", "pussy", "nigg", "gay".

Bất kỳ tên nào có chứa các âm tiết hoặc cụm từ mang ý nghĩa tương tự như trên ĐỀU PHẢI BỊ ĐÁNH DẤU LÀ TOXIC. Mức độ dung túng là 0%.`;

            const jsonSchemaPrompt = `
Bạn BẮT BUỘC trả về chuẩn JSON theo định dạng sau:
{
  "isTeamNameToxic": <boolean - Đánh giá true nếu tên đội chứa từ ngữ xúc phạm, chửi thề, vi phạm chuẩn mực>,
  "toxicPlayers": [<string array - Danh sách tên các tuyển thủ có ngôn từ vi phạm. Nếu an toàn, trả về mảng rỗng []>]
}`;

            const prompt = `Hãy kiểm duyệt:\n- Tên đội: "${teamName}"\n- Các tuyển thủ: [${players.join(", ")}].\n${jsonSchemaPrompt}`;

            const response = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: "system",
                        content: systemInstruction,
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error("API không trả về nội dung");

            return JSON.parse(content) as RosterSafetyResult;
        } catch (error) {
            console.error("AI Guard Error:", error);
            return { isTeamNameToxic: false, toxicPlayers: [] };
        }
    }

    static async resolveRuleQuery(
        question: string,
        rules: string,
        gameName: string,
    ) {
        try {
            const systemInstruction = `Bạn là Trợ lý AI của giải đấu eSports (Bộ môn: ${gameName.toUpperCase()}).
        Dưới đây là toàn bộ THỂ LỆ và LUẬT LỆ của giải:
        ---
        ${rules}
        ---
        Nhiệm vụ: Giải đáp câu hỏi của tuyển thủ dựa trên thể lệ trên.
        Yêu cầu: Ngắn gọn, súc tích, thân thiện và chính xác. Tuyệt đối không bịa đặt thông tin nếu trong thể lệ không ghi. Nếu không biết, hãy khuyên họ liên hệ BTC.`;

            const response = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: question },
                ],
                temperature: 0.5,
            });

            return response.choices[0]?.message?.content || null;
        } catch (error) {
            console.error("Lỗi AI Service (Resolve Rule):", error);
            return null;
        }
    }
}
