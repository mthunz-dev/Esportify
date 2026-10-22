export class ValidatorUtil {
    static isDiscordId(id: string): boolean {
        return /^\d{17,19}$/.test(id);
    }

    static isDiscordUsername(username: string): boolean {
        return /^[a-z0-9_.]{2,32}$/.test(username);
    }
    static isValidUrl(urlString: string): boolean {
        try {
            new URL(urlString);
            return true;
        } catch {
            return false;
        }
    }
    static isValidFile(fileName: string, extensions: string[]) {
        return extensions.some((ext) => fileName.endsWith(`.${ext}`));
    }

    static isEmptyObject(object: NonNullable<unknown>) {
        return Object.keys(object).length === 0;
    }
}
