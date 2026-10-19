import errors from "@/data/errors";
import { error } from "@/helpers/response";
import { checkPermission, isOnCooldown, type CooldownProps } from "@/helpers/utils";
import event from "@/layouts/event";
import prefixl from "@/layouts/prefix";
import subl from "@/layouts/subpf";
import { time } from "discord.js";
import ms from "ms";

const cooldown = new Map<string, CooldownProps[]>();

export default event("messageCreate", { once: false }, async (client, message) => {
    if (!message.member || message.author.bot || !message.inGuild()) return;

    const { config, collection } = client;
    const { prefix, aliases } = collection.commands;
    const { handler } = config;
    const id = message.author.id;

    if (!handler.commands.prefix) return;

    if (!message.content.toLowerCase().startsWith(handler.prefix.toLowerCase())) return;
    const prefixInput = handler.prefix;

    const args = message.content.split(/ +/g);
    if (args.shift()?.toLowerCase() !== prefixInput.toLowerCase()) return;
    const commandInput = args.shift()?.toLowerCase();
    if (!commandInput) return;

    const command: ReturnType<typeof prefixl> | ReturnType<typeof subl> | undefined =
        prefix.get(commandInput) || prefix.get(aliases.get(commandInput) || "");

    if (!command) return;

    try {
        const { options, subs, aliases } = command;

        if (!checkPermission(message.member, options)) throw errors.USER_MISSING_PERMISSION;

        const sendCooldownWarning = async (availableAt: number) =>
            await client.helpers.sendMessage(null, {
                message: {
                    content: `\⏰ **|** ${message.member}! Bạn sử dụng lệnh hơi nhanh rồi! Vui lòng đợi **${time(Math.floor(availableAt / 1000), "R")}** để dùng tiếp!`,
                },
                target: { channel: message.channel },
                sent: { deleteAfter: availableAt - Date.now() },
            });

        if (options.cooldown) {
            const availableAt = isOnCooldown(
                client,
                cooldown,
                id,
                command.name,
                ms(options.cooldown),
            );

            if (availableAt) return await sendCooldownWarning(availableAt);
        }

        if (options.sub) {
            const subInput = args[0].toLowerCase();

            if (subInput) {
                const sub = subs.get(subInput) || subs.get(aliases.get(subInput)!);

                if (sub) {
                    const { options } = sub;
                    args.shift();

                    if (options.cooldown) {
                        const availableAt = isOnCooldown(
                            client,
                            cooldown,
                            id,
                            options.fullName!,
                            ms(options.cooldown),
                        );

                        if (availableAt) return await sendCooldownWarning(availableAt);
                    }

                    return await sub.handler(client, message, args);
                }
            }
        }

        await command.handler(client, message, args);
    } catch (err: any) {
        error(err.message, message);
        if (!(err.code in errors)) console.error(err);
    }
});
