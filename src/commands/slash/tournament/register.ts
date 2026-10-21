import { slash } from "@/layouts/command";
import { getGameConfig } from "@/modules/games";
import {
    hyperlink,
    LabelBuilder,
    ModalBuilder,
    SlashCommandBuilder,
} from "discord.js";

export default slash(
    new SlashCommandBuilder()
        .setName("register")
        .setDescription("Register your team for the current tournament")
        .setDescriptionLocalizations({
            vi: "Đăng ký đội của bạn tham gia giải đấu hiện tại",
        })
        .setContexts(0),
    {
        global: true,
    },
    async (client, interaction) => {
        const activeTournament = await client.db.orm.public.Tournament.first({
            guildId: interaction.guildId,
            status: "ACTIVE",
        });

        if (!activeTournament) {
            return interaction.reply({
                content: "❌ Hiện không có giải đấu nào đang mở đăng ký.",
                flags: [64],
            });
        }

        const { name, rulesURL } = activeTournament;

        const tournamentId = activeTournament.id;
        const game = getGameConfig(activeTournament.game);

        if (!game)
            return interaction.reply({
                content:
                    "❌ Tựa game của giải đấu chưa được công bố, vui lòng đăng ký lại sau.",
                flags: [64],
            });

        const modal = new ModalBuilder()
            .setTitle("ĐĂNG KÝ THAM GIA GIẢI ĐẤU")
            .setCustomId(`register.${tournamentId}`)
            .addTextDisplayComponents((builder) =>
                builder.setContent(
                    [
                        `# ${name}`,
                        `- **\`Tựa game\`**: ${game.displayName.toUpperCase()}`,
                        `- **\`Thể lệ chi tiết\`**: ${rulesURL ? hyperlink("Thể lệ", rulesURL) : "Chưa công bố"}`,
                    ].join("\n"),
                ),
            )
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel("Tên đội của bạn")
                    .setTextInputComponent((builder) =>
                        builder
                            .setCustomId("team_name")
                            .setStyle(1)
                            .setMaxLength(50)
                            .setPlaceholder("(VD: T1, GAM Esports)")
                            .setRequired(true),
                    ),
                new LabelBuilder()
                    .setLabel("Thành viên đội")
                    // .setDescription(`-# Cách lấy username: `)
                    .setTextInputComponent((builder) =>
                        builder
                            .setCustomId("players_list")
                            .setStyle(2)
                            .setPlaceholder(
                                [
                                    `username_1 | ingame_1 (Đội trưởng)`,
                                    `username_2 | ingame_2`,
                                    `username_3 | ingame_3`,
                                    `...`,
                                ].join("\n"),
                            )
                            .setRequired(true),
                    ),
            );
        await interaction.showModal(modal);
    },
);
