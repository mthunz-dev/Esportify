import { GoogleGenAI, Type, type Schema } from "@google/genai";

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
    static async analyzeMatchImage(imageUrl: string, mimeType: string) {
        try {
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: [
                    { inlineData: { data: buffer.toString("base64"), mimeType } },
                    "Đóng vai là một trọng tài cho một trận đấu Esport. Hãy đọc ảnh dưới đây và trích xuất chính xác tên của các người chơi theo từng đội cùng số điểm tương ứng của đội đó",
                ],
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
}
