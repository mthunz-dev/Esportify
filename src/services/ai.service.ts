import Groq from "groq-sdk";
import { type GameConfig } from "@/modules/games/GameConfig";
// const VISION_MODEL = "llama-3.1-8b-instant";
const TEXT_MODEL = "qwen/qwen3.8-27b";

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

            // Ép API trả về JSON bằng cách chèn cấu trúc thẳng vào prompt
            const jsonSchemaPrompt = `
Bạn BẮT BUỘC trả về kết quả bằng chuẩn JSON theo cấu trúc sau, không kèm bất kỳ giải thích nào khác:
{
  "teamAScore": <number>,
  "teamBScore": <number>,
  "teamAPlayers": [<string array>],
  "teamBPlayers": [<string array>]
}`;
            const finalPrompt = `Bạn là trọng tài eSports cấp cao.\n${gameConfig.aiPrompt}\n${jsonSchemaPrompt}`;

            // Lưu ý: Thay đổi slug model dưới đây theo đúng ID model trên OpenRouter
            // Ví dụ: "nvidia/nemotron-3.5-super-vl"
            const OPENROUTER_MODEL_ID = "nvidia/nemotron-3.5-super-vl";

            const response = await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        // OpenRouter khuyến nghị thêm 2 header này để nhận diện ứng dụng (không bắt buộc)
                        "HTTP-Referer": "https://your-domain.com",
                        "X-Title": "Discord Esports Bot",
                    },
                    body: JSON.stringify({
                        model: OPENROUTER_MODEL_ID,
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
                    }),
                },
            );

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(
                    `OpenRouter API Error: ${response.status} - ${errText}`,
                );
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) throw new Error("API không trả về nội dung");

            return JSON.parse(content) as {
                teamAScore: number;
                teamBScore: number;
                teamAPlayers: string[];
                teamBPlayers: string[];
            };
        } catch (error) {
            console.error("Lỗi AI Service (Analyze Image OpenRouter):", error);
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
                model: TEXT_MODEL,
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
                model: TEXT_MODEL,
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
