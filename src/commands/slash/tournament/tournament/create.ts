import { subsl } from "@/layouts/command";
import { SlashCommandSubcommandBuilder } from "discord.js";
import { SupportedGames } from "@/modules/games";
import { FileHelper } from "@/helpers/file.helper";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("create")
        .setDescription("Create new tournament")
        .setDescriptionLocalizations({ vi: "Tạo giải đấu mới" })
        .addStringOption((o) =>
            o
                .setName("name")
                .setDescription("Tournament name")
                .setDescriptionLocalizations({ vi: "Tên giải đấu" })
                .setMaxLength(128)
                .setRequired(true),
        )
        .addStringOption((o) => {
            o.setName("game")
                .setDescription("Game name")
                .setDescriptionLocalizations({ vi: "Tên tựa game" })
                .setRequired(true);

            SupportedGames.forEach((game) => {
                o.addChoices({
                    value: game.id,
                    name: game.displayName,
                });
            });

            return o;
        })
        .addAttachmentOption((o) =>
            o
                .setName("rule_file")
                .setDescription("Rule of the tournament (.txt format)")
                .setDescriptionLocalizations({
                    vi: "Thể lệ của giải đấu (định dạng file .txt)",
                })
                .setRequired(false),
        ),
    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        await interaction.deferReply();
        const { guildId } = interaction;

        const name = interaction.options.getString("name", true);
        const game = interaction.options.getString("game", true);
        const ruleFile = interaction.options.getAttachment("rule_file");

        const pendingTournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });

        if (pendingTournament)
            throw new Error(
                "Đang có một giải đấu diễn ra trong máy chủ này rồi!",
            );

        let rules = null;

        if (ruleFile) {
            if (
                !ruleFile.name.endsWith(".txt") &&
                !ruleFile.contentType?.includes("text/plain")
            ) {
                return interaction.editReply(
                    "❌ Vui lòng chỉ sử dụng file định dạng `.txt` cho thể lệ!",
                );
            }

            rules = await FileHelper.readTextFromUrl(ruleFile.url);
        }

        await client.db.orm.public.Tournament.create({
            name,
            game,
            rules,
            guildId,
        });

        const ruleStatus = rules
            ? "✅ Đã nạp thành công file thể lệ."
            : "⚠️ Chưa có thể lệ. Hãy dùng lệnh `/tournament set-rule` sau.";

        await interaction.editReply(
            `✅ Đã khởi tạo thành công giải đấu **${name}** bộ môn **${game.toUpperCase()}**!\n${ruleStatus}`,
        );
    },
);
