export class FileHelper {
    static async readTextFromUrl(url: string): Promise<string | null> {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            const textContent = await response.text();
            return textContent.trim();
        } catch (error) {
            console.error("Lỗi đọc file txt:", error);
            return null;
        }
    }
}
