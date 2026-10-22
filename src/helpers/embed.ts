import { EmbedBuilder, type ColorResolvable } from "discord.js";

export class EmbedHelper {
    static readonly COLORS = {
        SUCCESS: "#00FF00" as ColorResolvable,
        ERROR: "#FF0000" as ColorResolvable,
        WARNING: "#FFA500" as ColorResolvable,
        INFO: "#3498DB" as ColorResolvable,
        DEFAULT: "#2B2D31" as ColorResolvable, // Màu tệp với nền Discord
    };

    static success(description: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(this.COLORS.SUCCESS)
            .setDescription(`✅ ${description}`);
    }

    static error(description: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(this.COLORS.ERROR)
            .setDescription(`❌ ${description}`);
    }

    static info(description: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(this.COLORS.INFO)
            .setDescription(`ℹ️ ${description}`);
    }

    static warning(description: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(this.COLORS.WARNING)
            .setDescription(`⚠️ ${description}`);
    }
}
