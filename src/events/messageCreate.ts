import errors from "@/data/errors";
import { ResponseHelper } from "@/helpers/response";
import { Guard } from "@/helpers/guard";
import event from "@/layouts/event";
import { prefix as prefixl, subpf as subl } from "@/layouts/command";
import { time } from "discord.js";
import ms from "ms";

export default event(
    "messageCreate",
    { once: false },
    async (client, message) => {
        if (!message.member || message.author.bot || !message.inGuild()) return;

        const { config, collection } = client;
        const { prefix, aliases } = collection.commands;
        const { handler } = config;
        const userId = message.author.id;

        if (!handler.commands.prefix) return;

        if (
            !message.content
                .toLowerCase()
                .startsWith(handler.prefix.toLowerCase())
        )
            return;
        const prefixInput = handler.prefix;

        const args = message.content.split(/ +/g);
        if (args.shift()?.toLowerCase() !== prefixInput.toLowerCase()) return;
        const commandInput = args.shift()?.toLowerCase();
        if (!commandInput) return;

        const command:
            ReturnType<typeof prefixl> | ReturnType<typeof subl> | undefined =
            prefix.get(commandInput) ||
            prefix.get(aliases.get(commandInput) || "");

        if (!command) return;

        try {
            const { options, subs, aliases } = command;

            if (!Guard.checkPermission(message.member, options))
                throw errors.USER_MISSING_PERMISSION;

            const sendCooldownWarning = async (expirationTime: number) => {
                ResponseHelper.send(
                    `\⏰ **|** ${message.member}! Bạn sử dụng lệnh hơi nhanh rồi! Vui lòng đợi **${time(Math.floor(expirationTime / 1000), "R")}** để dùng tiếp!`,
                    {
                        channel: message.channel,
                        deleteAfter: expirationTime - Date.now(),
                    },
                );
            };

            const expirationTime = Guard.isOnCooldown(
                userId,
                command.name,
                options.cooldown ? ms(options.cooldown) : 0,
            );

            if (expirationTime)
                return await sendCooldownWarning(expirationTime);

            if (options.sub) {
                const subInput = args[0].toLowerCase();

                if (subInput) {
                    const sub =
                        subs.get(subInput) || subs.get(aliases.get(subInput)!);

                    if (sub) {
                        const { options } = sub;
                        args.shift();

                        const expirationTime = Guard.isOnCooldown(
                            userId,
                            options.fullName!,
                            options.cooldown ? ms(options.cooldown) : 0,
                        );

                        if (expirationTime)
                            return await sendCooldownWarning(expirationTime);

                        return await sub.handler(client, message, args);
                    }
                }
            }

            await command.handler(client, message, args);
        } catch (err: any) {
            ResponseHelper.sendError(err.message, { replyTo: message });

            if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) {
                console.error("[Command Handle Error]:", err);
            }
        }
    },
);
