import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

(async () => {
    const listModels = await ai.models.list();

    console.log(listModels.page.map((p) => p.name));
})();
