import event from "@/layouts/event";
import { time } from "discord.js";
import ms from "ms";
import { ResponseHelper } from "@/helpers/response";
import { Guard } from "@/helpers/guard";

export default event(
    "interactionCreate",
    { once: false },
    async (client, interaction) => {
        if (!interaction.inCachedGuild()) return;

        if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
            if (!interaction.channel) return;

            const { config, collection } = client;
            const commandConfig = config.handler.commands;
            const userId = interaction.user.id;

            if (
                commandConfig.slash === false &&
                interaction.isChatInputCommand()
            )
                return;
            if (
                commandConfig.user === false &&
                interaction.isUserContextMenuCommand()
            )
                return;
            if (
                commandConfig.message === false &&
                interaction.isMessageContextMenuCommand()
            )
                return;

            const command = collection.commands.slash.get(
                interaction.commandName,
            );

            if (!command) return;

            let handler = command.handler;
            let autocomple = command.autocomple;
            let commandName = command.structure.name;
            let options = command.options;

            if (options.sub) {
                const subName = interaction.options.getSubcommand(true);
                const sub = command.subs.get(subName);

                if (sub) {
                    handler = sub.handler;
                    autocomple = sub.autocomple;
                    commandName += " " + subName;
                    options = sub.options;
                }
            }

            const hasPermission = Guard.checkPermission(
                interaction.member,
                options,
            );

            if (interaction.isAutocomplete()) {
                if (!autocomple) return;
                if (!hasPermission) return;

                try {
                    await autocomple(client, interaction);
                } catch (err) {
                    console.error("[Autocomple Handle Error]:", err);
                }

                return;
            }

            try {
                if (!hasPermission)
                    return await ResponseHelper.sendError(
                        `Bạn không có đủ quyền để thực hiện thao tác này`,
                        { interaction },
                    );

                const expirationTime = Guard.isOnCooldown(
                    userId,
                    commandName,
                    options.cooldown ? ms(options.cooldown) : 0,
                );

                if (expirationTime)
                    return await ResponseHelper.send(
                        `\⏰ **|** ${interaction.member}! Bạn sử dụng lệnh hơi nhanh rồi! Vui lòng đợi **${time(Math.floor(expirationTime / 1000), "R")}** để dùng tiếp!`,
                        {
                            interaction,
                            deleteAfter: expirationTime - Date.now(),
                            ephemeral: true,
                        },
                    );

                await handler(client, interaction);
            } catch (err: any) {
                ResponseHelper.sendError(err.message, { interaction });
                if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) {
                    console.error("[Command Handle Error]:", err);
                }
            }
        }
    },
);
