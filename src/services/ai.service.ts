import Groq from "groq-sdk";
import { type GameConfig } from "@/modules/games/GameConfig";
const GROQ_MODEL = "qwen/qwen3.8-27b";

const groq = new Groq();

export interface RosterSafetyResult {
    isTeamNameToxic: boolean;
    toxicPlayers: string[];
}

export class AiService {
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
Bạn BẮT BUỘC trả về kết quả bằng chuẩn JSON theo cấu trúc sau:
{
  "teamAScore": <number - Điểm số hoặc số round thắng của đội A>,
  "teamBScore": <number - Điểm số hoặc số round thắng của đội B>,
  "teamAPlayers": [<string array - Danh sách tên ingame (IGN) của người chơi team A>],
  "teamBPlayers": [<string array - Danh sách tên ingame (IGN) của người chơi team B>]
}`;
            const finalPrompt = `Bạn là trọng tài eSports cấp cao.\n${gameConfig.aiPrompt}\n${jsonSchemaPrompt}`;

            const response = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages: [
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

            return JSON.parse(content) as {
                teamAScore: number;
                teamBScore: number;
                teamAPlayers: string[];
                teamBPlayers: string[];
            };
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
