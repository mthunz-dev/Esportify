import event from "@/layouts/event";
import { time } from "discord.js";
import ms from "ms";
import ExpenseUser from "@/classes/ExpenseUser";
import { checkPermission, isOnCooldown, type CooldownProps } from "@/helpers/utils";
import { error } from "@/helpers/response";
import errors from "@/data/errors";

const cooldown = new Map<string, CooldownProps[]>();

export default event("interactionCreate", { once: false }, async (client, interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inCachedGuild()) return;
    if (!interaction.channel) return;

    const { config, db, collection } = client;
    const { handler } = config;
    const { id } = interaction.user;

    if (handler.commands.slash === false && interaction.isChatInputCommand()) return;
    if (handler.commands.user === false && interaction.isUserContextMenuCommand()) return;
    if (handler.commands.message === false && interaction.isMessageContextMenuCommand()) return;

    const command = collection.commands.slash.get(interaction.commandName);

    if (!command) return;

    try {
        const { options, subs } = command;

        if (!checkPermission(interaction.member, options)) throw errors.USER_MISSING_PERMISSION;

        const sendCooldownWarning = async (availableAt: number) =>
            await client.helpers.sendMessage(null, {
                message: {
                    content: `\⏰ **|** ${interaction.member}! Bạn sử dụng lệnh hơi nhanh rồi! Vui lòng đợi **${time(Math.floor(availableAt / 1000), "R")}** để dùng tiếp!`,
                    flags: [64],
                },
                target: { channel: interaction.channel! },
                sent: { deleteAfter: availableAt - Date.now() },
            });

        const data = await db.orm.public.User.upsert({
            create: { id },
            update: {},
            conflictOn: { id },
        });

        const user = new ExpenseUser(id, data, client);
        if (!user.data) return;

        if (options.cooldown) {
            const availableAt = isOnCooldown(
                client,
                cooldown,
                id,
                command.structure.name,
                ms(options.cooldown),
            );

            if (availableAt) return await sendCooldownWarning(availableAt);
        }

        if (options.sub) {
            const subName = interaction.options.getSubcommand(true);
            const sub = subs.get(subName);

            if (sub) {
                const { options } = sub;

                if (options.cooldown) {
                    const fullName = command.structure.name + " " + subName;

                    const availableAt = isOnCooldown(
                        client,
                        cooldown,
                        id,
                        fullName,
                        ms(options.cooldown),
                    );

                    if (availableAt) return await sendCooldownWarning(availableAt);
                }
                return await sub.handler(client, user, interaction);
            }
        }

        await command.handler(client, user, interaction);
    } catch (err: any) {
        error(err.message, interaction);
        if (!(err.code in errors)) console.error(err);
    }
});
