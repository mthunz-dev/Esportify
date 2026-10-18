import { emojis } from "@/data/emojis";
import { formatNumber } from "./utils";

export const parsers = {
    user: async (
        client: ExtendedClient,
        record: { key: string | string[]; value: number },
        pos: number,
        emoji: string,
    ) => {
        const prefix = emojis[`medal${pos as 1 | 2 | 3}`] || `\` #${pos} \``;

        const userId = record.key as string;
        const member = client.PNV.members.cache.get(userId);

        const label = `**\`${member?.user.username}\`** \`${formatNumber(record.value)}\` ${emoji}`;

        return `${prefix} ${label}`;
    },
} as {
    [key: string]: (
        client: ExtendedClient,
        record: { key: string | string[]; value: number },
        pos: number,
        emoji: string,
    ) => Promise<string>;
};
