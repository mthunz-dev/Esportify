import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { type GameConfig } from "@/modules/games/GameConfig";

const ai = new GoogleGenAI({});

const matchSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        teamAScore: { type: Type.INTEGER, description: "Điểm số hoặc số round thắng của đội A" },
        teamBScore: { type: Type.INTEGER, description: "Điểm số hoặc số round thắng của đội B" },
        teamAPlayers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Danh sách tên trong game (ingame/IGN) của người chơi thuộc team A",
        },
        teamBPlayers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Danh sách tên trong game (ingame/IGN) của người chơi thuộc team B",
        },
    },
    required: ["teamAScore", "teamBScore", "teamAPlayers", "teamBPlayers"],
};

export class AiService {
    static async analyzeMatchImage(imageUrl: string, mimeType: string, gameConfig: GameConfig) {
        try {
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const finalPrompt = `Bạn là trọng tài eSports cấp cao.\n${gameConfig.aiPrompt}\nTrả về kết quả bằng chuẩn JSON theo cấu trúc yêu cầu.`;

            const response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: [{ inlineData: { data: buffer.toString("base64"), mimeType } }, finalPrompt],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: matchSchema,
                },
            });

            return JSON.parse(response.text!) as {
                teamAScore: number;
                teamBScore: number;
                teamAPlayers: string[];
                teamBPlayers: string[];
            };
        } catch (error) {
            console.error("Lỗi AI Service:", error);
            return null;
        }
    }

    static async resolveRuleQuery(question: string, rules: string, gameName: string) {
        try {
            const systemInstruction = `Bạn là Trợ lý AI của giải đấu eSports (Bộ môn: ${gameName.toUpperCase()}).
        Dưới đây là toàn bộ THỂ LỆ và LUẬT LỆ của giải:
        ---
        ${rules}
        ---
        Nhiệm vụ: Giải đáp câu hỏi của tuyển thủ dựa trên thể lệ trên.
        Yêu cầu: Ngắn gọn, súc tích, thân thiện và chính xác. Tuyệt đối không bịa đặt thông tin nếu trong thể lệ không ghi. Nếu không biết, hãy khuyên họ liên hệ BTC.`;

            const response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: [
                    { role: "user", parts: [{ text: systemInstruction }] },
                    { role: "user", parts: [{ text: question }] },
                ],
            });

            return response.text;
        } catch (error) {
            console.error("Lỗi AI Service", error);
            return null;
        }
    }
}
