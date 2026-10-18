import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function checkAPI() {
    console.log("⏳ Đang kết nối với Gemini...");

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents:
                "Đóng vai một trọng tài giải đấu Esport, hãy nói một câu chào mừng ngắn gọn bằng tiếng Việt.",
        });

        console.log("\n✅ API hoạt động xuất sắc! Kết quả trả về:");
        console.log("--------------------------------------------------");
        console.log(response.text);
        console.log("--------------------------------------------------");
    } catch (error) {
        console.error("\n❌ Có lỗi xảy ra. Hãy kiểm tra lại API Key của bạn:");
        console.error(error);
    }
}

checkAPI();
