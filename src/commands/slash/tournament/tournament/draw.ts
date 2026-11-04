import { EmbedHelper } from "@/helpers/embed";
import MessageBuilder from "@/helpers/message-builder";
import { ResponseHelper } from "@/helpers/response";
import { subsl } from "@/layouts/command";
import { TournamentService } from "@/services/tournament.service";
import { SlashCommandSubcommandBuilder } from "discord.js";
import _ from "lodash";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("draw")
        .setDescription("Draw ")
        .setDescriptionLocalizations({
            vi: "Sắp xếp ngẫu nhiên các đội vào trận đấu",
        })
        .addBooleanOption((o) =>
            o
                .setName("allow-bye")
                .setDescription(
                    "Allow additional teams to advance directly to the next round (Default: Not Allowed)",
                )
                .setDescriptionLocalizations({
                    vi: "Cho phép các đội thừa tiến thẳng vào vòng tiếp theo (Mặc định: Không cho phép)",
                }),
        ),

    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        await ResponseHelper.defer(interaction);

        const { guildId } = interaction;
        const allowBye = interaction.options.getBoolean("allow-bye");

        const activeTournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });
        if (!activeTournament)
            return await ResponseHelper.sendError(
                `Chưa có giải đấu nào diễn ra trong máy chủ này!`,
                { interaction },
            );

        await interaction.editReply(
            new MessageBuilder()
                .setColor("Orange")
                .setDescription("⌛ Đang chia đội chơi vào các trận đấu...")
                .build(),
        );

        const updatedMatches = await TournamentService.drawMatches(
            activeTournament.id,
            !!allowBye,
        );

        if (!updatedMatches)
            return await interaction.editReply({
                embeds: [
                    EmbedHelper.error(
                        `Số đội chơi đăng ký chưa đủ hoặc có lỗi trong quá trình chia bảng!`,
                    ),
                ],
            });

        await interaction.editReply({
            embeds: [
                EmbedHelper.success(
                    `Xếp thành công **${updatedMatches}** cặp đấu cho giải đấu!`,
                ),
            ],
        });
    },
);
