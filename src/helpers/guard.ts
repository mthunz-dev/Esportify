import { Collection, GuildMember } from "discord.js";
import type {
    PrefixOptions,
    SlashOptions,
    SubPrefixOptions,
} from "@/types/command";
import config from "@/config";
import type { ComponentOptions } from "@/layouts/component";

export type CooldownProps = { name: string; availableAt: number };

const cooldowns = new Collection<string, Collection<string, number>>();

export class Guard {
    static isOnCooldown(
        userId: string,
        commandName: string,
        cooldownSeconds: number,
    ) {
        if (!cooldownSeconds) return 0;
        if (this.isAdmin(userId)) return 0;

        if (!cooldowns.has(commandName))
            cooldowns.set(commandName, new Collection<string, number>());

        const timestamps = cooldowns.get(commandName)!;
        const now = Date.now();
        const cooldownMs = cooldownSeconds * 1000;

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId)! + cooldownMs;

            if (now < expirationTime) return expirationTime;
        }

        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), cooldownMs);

        return 0;
    }

    static isAdmin(userId: string) {
        const { users } = config;

        const isDev = users.developers.includes(userId);
        const isOwner = userId === users.ownerId;

        if (isDev || isOwner) return true;

        return false;
    }

    static checkPermission(
        member: GuildMember,
        options:
            SlashOptions | PrefixOptions | SubPrefixOptions | ComponentOptions,
    ) {
        const users = config.users;
        const id = member.id;

        const isDev = users.developers.includes(id);
        const isOwner = id === users.ownerId;
        const isContributor = users.contributors.includes(id);

        if (options.contributorsOnly && !isContributor && !isOwner && !isDev)
            return false;
        if (options.ownerOnly && !isDev && !isOwner) return false;
        if (options.developersOnly && !isDev) return false;

        return true;
    }
}

// export const isOnCooldown = (
//     client: ExtendedClient,
//     cooldown: Map<string, CooldownProps[]>,
//     userId: string,
//     commandName: string,
//     cooldownTime: number,
// ) => {
//     const { users } = client.config;

//     const isDev = users.developers.includes(userId);
//     const isOwner = userId === users.ownerId;

//     if (isDev || isOwner) return false;

//     let data = cooldown.get(userId) || ([] as CooldownProps[]);
//     const newCooldown = {
//         name: commandName,
//         availableAt: Date.now() + cooldownTime,
//     };

//     if (data) {
//         const cooldownIndex = data.findIndex(
//             ({ name }) => name === commandName,
//         );

//         if (cooldownIndex + 1) {
//             const { availableAt } = data[cooldownIndex];

//             if (availableAt >= Date.now()) {
//                 return availableAt;
//             } else data = data.splice(cooldownIndex, 1);
//         }
//     }

//     cooldown.set(userId, [...data, newCooldown]);

//     setTimeout(() => {
//         let data = cooldown.get(userId);

//         if (data) {
//             const cooldownIndex = data.findIndex(
//                 ({ name }) => name === commandName,
//             );

//             if (!(cooldownIndex + 1)) {
//                 data = data.splice(cooldownIndex, 1);

//                 if (data) cooldown.set(userId, data);
//                 else cooldown.delete(userId);
//             }
//         } else cooldown.delete(userId);
//     }, cooldownTime);

//     return false;
// };

// export const checkPermission = (
//     member: GuildMember,
//     options: SlashOptions | PrefixOptions | SubPrefixOptions | ComponentOptions,
// ) => {
//     const { users } = config;
//     const { id } = member;

//     const isDev = users.developers.includes(id);
//     const isOwner = id === users.ownerId;
//     const isContributor = users.contributors.includes(id);

//     if (options.contributorsOnly && !isContributor && !isOwner && !isDev)
//         return false;
//     if (options.ownerOnly && !isDev && !isOwner) return false;
//     if (options.developersOnly && !isDev) return false;

//     return true;
// };
