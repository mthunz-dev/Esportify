import event from "@/layouts/event";
import { time } from "discord.js";
import ms from "ms";
import errors from "@/data/errors";
import { ResponseHelper } from "@/helpers/response";
import { Guard } from "@/helpers/guard";

export default event(
    "interactionCreate",
    { once: false },
    async (client, interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        const { config, collection } = client;
        const { handler } = config;
        const userId = interaction.user.id;

        if (
            handler.commands.slash === false &&
            interaction.isChatInputCommand()
        )
            return;
        if (
            handler.commands.user === false &&
            interaction.isUserContextMenuCommand()
        )
            return;
        if (
            handler.commands.message === false &&
            interaction.isMessageContextMenuCommand()
        )
            return;

        const command = collection.commands.slash.get(interaction.commandName);

        if (!command) return;

        try {
            const { options, subs } = command;

            if (!Guard.checkPermission(interaction.member, options))
                throw errors.USER_MISSING_PERMISSION;

            const sendCooldownWarning = async (expirationTime: number) =>
                await ResponseHelper.send(
                    `\⏰ **|** ${interaction.member}! Bạn sử dụng lệnh hơi nhanh rồi! Vui lòng đợi **${time(Math.floor(expirationTime / 1000), "R")}** để dùng tiếp!`,

                    {
                        channel: interaction.channel!,
                        deleteAfter: expirationTime - Date.now(),
                        ephemeral: true,
                    },
                );

            const expirationTime = Guard.isOnCooldown(
                userId,
                command.structure.name,
                options.cooldown ? ms(options.cooldown) : 0,
            );

            if (expirationTime)
                return await sendCooldownWarning(expirationTime);

            if (options.sub) {
                const subName = interaction.options.getSubcommand(true);
                const sub = subs.get(subName);

                if (sub) {
                    const { options } = sub;

                    if (options.cooldown) {
                        const fullName = command.structure.name + " " + subName;

                        const expirationTime = Guard.isOnCooldown(
                            userId,
                            fullName,
                            options.cooldown ? ms(options.cooldown) : 0,
                        );

                        if (expirationTime)
                            return await sendCooldownWarning(expirationTime);
                    }
                    return await sub.handler(client, interaction);
                }
            }

            await command.handler(client, interaction);
        } catch (err: any) {
            ResponseHelper.sendError(err.message, { interaction });
            if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) {
                console.error("[Command Handle Error]:", err);
            }
        }
    },
);
