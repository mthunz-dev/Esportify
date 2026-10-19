import subsl from "@/layouts/subsl";
import {
    ActionRowBuilder,
    LabelBuilder,
    ModalBuilder,
    SlashCommandSubcommandBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
} from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("create")
        .setDescription("Create new team")
        .setDescriptionLocalizations({ vi: "Tạo đội thi đấu mới" })
        .addStringOption((o) =>
            o
                .setName("name")
                .setDescription("Team name (Eg: T1, GAM Esports)")
                .setDescriptionLocalizations({ vi: "Tên đội thi đấu (VD: T1, GAM Esports)" })
                .setMaxLength(50)
                .setRequired(true),
        )
        .addStringOption((o) =>
            o
                .setName("tag")
                .setDescription("Team tag (Eg: T1, GAM)")
                .setDescriptionLocalizations({ vi: "Tên viết tắt của đội (VD: T1, GAM)" })
                .setMaxLength(5)
                .setRequired(false),
        ),
    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        // await interaction.deferReply();
        const { guildId } = interaction;

        const name = interaction.options.getString("name", true);
        const tag = interaction.options.getString("tag");

        const tournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });

        if (!tournament) throw new Error("Chưa có giải đấu nào đang diễn ra trong máy chủ này!");

        const modal = new ModalBuilder()
            .setCustomId(`create_team.${interaction.id}`)
            .setTitle(tournament.name)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `Điền tên các người chơi của đội vào phía bên dưới`,
                ),
            )
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel("Tên đội")
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("team_name")
                            .setStyle(1)
                            .setMaxLength(50)
                            .setPlaceholder("Tên đội thi đấu (VD: T1, GAM Esports)")
                            .setValue(name)
                            .setRequired(true),
                    ),
                new LabelBuilder().setLabel("Tag đội").setTextInputComponent(
                    new TextInputBuilder()
                        .setCustomId("team_tag")
                        .setStyle(1)
                        .setMaxLength(5)
                        .setPlaceholder("Tên viết tắt của đội (VD: T1, GAM)")
                        .setValue(tag || "")
                        .setRequired(false),
                ),
            );

        await interaction.showModal(modal);

        // try {
        //     await client.db.orm.public.Team.create({
        //         name,
        //         tag,
        //         tournamentId: tournament.id,
        //     });

        //     await interaction.editReply(
        //         `✅ Tạo thành công đội thi đấu **${name}** thuộc giải thi đấu **${tournament.name}**` +
        //             tag
        //             ? `với tag **[${tag}]**`
        //             : "",
        //     );
        // } catch (error) {
        //     if (error instanceof Error && "sqlState" in error && error.sqlState === "23505") {
        //         throw Error("Đội thi đã tồn tại trong giải đấu");
        //     }

        //     throw error;
        // }
    },
);
