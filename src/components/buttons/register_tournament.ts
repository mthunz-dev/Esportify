import { ResponseHelper } from "@/helpers/response";
import { button } from "@/layouts/component";
import { LabelBuilder, ModalBuilder } from "discord.js";

export default button(
    "register_tournament",
    { everyone: true },
    async (client, interaction) => {
        const [, tournamentId] = interaction.customId.split(".");

        const tournament = await client.db.orm.public.Tournament.first({
            id: tournamentId,
        });

        if (!tournament)
            return ResponseHelper.sendError("Giải đấu không tồn tại!", {
                interaction,
                ephemeral: true,
            });

        const modal = new ModalBuilder()
            .setTitle("THÔNG TIN THÀNH VIÊN ĐỘI")
            .setCustomId(`register_tournament.${tournament.id}`)
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
        return await interaction.showModal(modal);
    },
);
