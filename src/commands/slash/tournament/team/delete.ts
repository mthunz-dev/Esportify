import { EmbedHelper } from "@/helpers/embed";
import MessageBuilder from "@/helpers/message-builder";
import { ResponseHelper } from "@/helpers/response";
import { subsl } from "@/layouts/command";
import { or } from "@prisma/orm-postgres/orm-client";
import { SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("delete")
        .setDescription("Delete exsiting team")
        .setDescriptionLocalizations({ vi: "Xoá đội chơi đã đăng ký" })
        .addStringOption((o) =>
            o
                .setName("name")
                .setDescription("Team name to delete")
                .setDescriptionLocalizations({ vi: "Tên đội chơi muốn xoá" })
                .setMaxLength(50)
                .setAutocomplete(true)
                .setRequired(true),
        ),
    {
        global: true,
    },
    async (client, interaction) => {
        await interaction.deferReply();
        const optionValue = interaction.options.getString("name", true);

        const team = await client.db.orm.public.Team.first((t) =>
            or(t.name.ilike(optionValue), t.id.ilike(optionValue)),
        );

        if (!team)
            return ResponseHelper.sendError(`Đội chơi không tồn tại !`, {
                interaction,
            });

        await ResponseHelper.send(
            new MessageBuilder()
                .setColor("Orange")
                .setDescription(`- Xác nhận xoá đội chơi \`${team.name}\`?`)
                .addComponents([
                    {
                        type: 2,
                        customId: "cancel",
                        label: "Huỷ",
                        style: 3,
                    },
                    {
                        type: 2,
                        customId: "delete",
                        label: "Xoá",
                        style: 4,
                    },
                ]),
            {
                interaction,
                components: {
                    allowedUsers: [interaction.user.id],
                    onCollect: async (interaction) => {
                        if (!interaction.inCachedGuild()) return;
                        await interaction.deferUpdate();

                        if (interaction.customId === "cancel")
                            return await interaction.message
                                .delete()
                                .catch(() => {});

                        try {
                            await client.db.orm.public.Team.where({
                                id: team.id,
                            }).delete();

                            await interaction.editReply({
                                embeds: [
                                    EmbedHelper.success(
                                        `Đã xoá đội chơi \`${team.name}\``,
                                    ),
                                ],
                                components: [],
                            });
                        } catch (err) {
                            ResponseHelper.sendError(
                                `Đã có lỗi trong quá trình xoá đội! Vui lòng kiểm tra log`,
                                { interaction },
                            );
                            console.error(err);
                        }
                    },
                },
            },
        );
    },
    async (client, interaction) => {
        const { guildId } = interaction;

        const tournament = await client.db.orm.public.Tournament.first({
            guildId,
        });
        if (!tournament) return;

        const focusedValue = interaction.options.getFocused();

        const teamList = await client.db.orm.public.Team.where((t) =>
            t.name.like(`${focusedValue}%`),
        )
            .limit(25)
            .all();

        await interaction.respond(
            teamList.map((t) => ({ name: t.name, value: t.id })),
        );
    },
);
