import { bold, Collection, resolveColor, Message, GuildMember } from "discord.js";
import _ from "lodash";
import type { PrefixOptions, SlashOptions, SubPrefixOptions } from "@/types/command";
import { isNumber } from "./validator";
import config from "@/config";
import type { ComponentOptions } from "@/layouts/component";

export const formatNumber = (num: number, symbol?: string) =>
    new Intl.NumberFormat("en-US").format(num) + (symbol || "");

export const parseNumber = (input: string | number) => {
    input = String(input);

    if (input.includes("~")) {
        const [min, max] = input.split("~").map((i) => Number(i));

        return _.random(min, max);
    }
    return Number(input);
};

export const processString = (a: number, b: number) => {
    const formatedA = formatNumber(a);
    const formatedB = formatNumber(b);

    return (a >= b ? bold(formatedA) : formatedA) + "/" + bold(formatedB);
};

export const emojiURL = (emoji: string) => {
    if (!emoji?.includes(":")) return;

    return `https://cdn.discordapp.com/emojis/${emoji.split(":")[2].slice(0, -1)}.png`;
};

export const centerText = (text: string, len: number) => {
    if (text.length >= len) return text;

    const total = len - text.length;
    const left = Math.floor(total / 2);

    return text.padStart(text.length + left, " ").padEnd(len, " ");
};

export const parseMillify = (input: string | null) => {
    if (!input) return null;

    const num = isNumber(input, { positive: true, zero: true });

    if (num !== false) return num;

    const regexK = /^[0-9]\d*[Kk]$/;
    const regexM = /^[0-9]\d*[Mm]$/;

    if (regexK.test(input)) return parseInt(input) * 1_000;
    if (regexM.test(input)) return parseInt(input) * 1_000_000;

    return null;
};

// export const randomMapValue = <K, T>(map: Collection<K, T> | Map<K, T>) => {
//     const values = [...map.values()];
//     return values[_.random(values.length)];
// };

export const shuffleMap = <K, T>(map: Collection<K, T>) => {
    return new Collection(_.shuffle([...map.entries()]));
};

export const delay = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const disableComponents = async (message: Message<true>) => {
    message = await message.fetch();

    const embeds = message.embeds.map((embed) => {
        return {
            ...embed.toJSON(),
            color: resolveColor("Grey"),
        };
    });

    const components = message.components.map((row) => {
        return {
            type: row.type,
            components: row.components.map((component) => {
                return {
                    ...component.toJSON(),
                    disabled: true,
                };
            }),
        };
    });

    await message.edit({ embeds, components }).catch(() => {});
};

interface MyMsOptions {
    long?: boolean;
    hideSec?: boolean;
    hideMin?: boolean;
    hideHour?: boolean;
    hideDay?: boolean;
}

export const myms = (time: string | number, options?: MyMsOptions) => {
    const timeRegex = /^(?:(\d+))?(?:(\d+d))?(?:(\d+h))?(?:(\d+m))?(?:(\d+s))?$/;
    if (!timeRegex.test(String(time))) return "INVALID_TIME";

    const units = {
        d: 86400000,
        h: 3600000,
        m: 60000,
        s: 1000,
    } as Record<string, number>;

    if (typeof time === "string") {
        const timeRegex = /(\d+)([d|h|m|s])/g;
        let ms = 0;

        let match;
        while ((match = timeRegex.exec(time)) !== null) {
            const value = parseInt(match[1], 10);
            const unit = match[2];
            ms += value * units[unit];
        }

        return ms;
    } else {
        const { d, h, m } = units;

        const days = Math.floor(time / d);
        const hours = Math.floor((time % d) / h);
        const minutes = Math.floor((time % h) / m);
        const seconds = Math.floor((time % m) / 1000);

        const parts = [];

        if (!options?.hideDay && days > 0) {
            parts.push(`${days}${options?.long ? " ngày" : "d"}`);
        }
        if (!options?.hideHour && hours > 0) {
            parts.push(`${hours}${options?.long ? " giờ" : "h"}`);
        }
        if (!options?.hideMin && minutes > 0) {
            parts.push(`${minutes}${options?.long ? " phút" : "m"}`);
        }
        if (!options?.hideSec && seconds > 0) {
            parts.push(`${seconds}${options?.long ? " giây" : "s"}`);
        }

        return parts.join(" ") || "INVALID_TIME";
    }
};

export type CooldownProps = { name: string; availableAt: number };
export const isOnCooldown = (
    client: ExtendedClient,
    cooldown: Map<string, CooldownProps[]>,
    userId: string,
    commandName: string,
    cooldownTime: number,
) => {
    const { users } = client.config;

    const isDev = users.developers.includes(userId);
    const isOwner = userId === users.ownerId;

    if (isDev || isOwner) return false;

    let data = cooldown.get(userId) || ([] as CooldownProps[]);
    const newCooldown = {
        name: commandName,
        availableAt: Date.now() + cooldownTime,
    };

    if (data) {
        const cooldownIndex = data.findIndex(({ name }) => name === commandName);

        if (cooldownIndex + 1) {
            const { availableAt } = data[cooldownIndex];

            if (availableAt >= Date.now()) {
                return availableAt;
            } else data = data.splice(cooldownIndex, 1);
        }
    }

    cooldown.set(userId, [...data, newCooldown]);

    setTimeout(() => {
        let data = cooldown.get(userId);

        if (data) {
            const cooldownIndex = data.findIndex(({ name }) => name === commandName);

            if (!(cooldownIndex + 1)) {
                data = data.splice(cooldownIndex, 1);

                if (data) cooldown.set(userId, data);
                else cooldown.delete(userId);
            }
        } else cooldown.delete(userId);
    }, cooldownTime);

    return false;
};

export const checkPermission = (
    member: GuildMember,
    options: SlashOptions | PrefixOptions | SubPrefixOptions | ComponentOptions,
) => {
    const { users } = config;
    const { id } = member;

    const isDev = users.developers.includes(id);
    const isOwner = id === users.ownerId;
    const isContributor = users.contributors.includes(id);

    if (options.contributorsOnly && !isContributor && !isOwner && !isDev) return false;
    if (options.ownerOnly && !isDev && !isOwner) return false;
    if (options.developersOnly && !isDev) return false;

    return true;
};
