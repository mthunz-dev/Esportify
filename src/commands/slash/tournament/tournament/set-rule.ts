import { FileHelper } from "@/helpers/file";
import { subsl } from "@/layouts/command";
import { SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("set-rule")
        .setDescription("Establish rule for the tournament")
        .setDescriptionLocalizations({ vi: "Thiết lập thể lệ cho giải đấu" })
        .addAttachmentOption((o) =>
            o
                .setName("rule_file")
                .setDescription("Rule of the tournament (.txt format)")
                .setDescriptionLocalizations({
                    vi: "Thể lệ của giải đấu (định dạng file .txt)",
                })
                .setRequired(true),
        ),
    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        const { db } = client;

        await interaction.deferReply();

        const activeTournament = await db.orm.public.Tournament.first({
            guildId: interaction.guildId!,
            status: "ACTIVE",
        });

        if (!activeTournament) {
            return interaction.editReply(
                "❌ Không có giải đấu nào đang diễn ra. Hãy yêu cầu BTC chạy lệnh `/tournament create`.",
            );
        }

        const attachment = interaction.options.getAttachment("rule_file", true);

        if (
            !attachment.name.endsWith(".txt") &&
            !attachment.contentType?.includes("text/plain")
        ) {
            return interaction.editReply(
                "❌ Hệ thống AI chỉ hỗ trợ đọc file văn bản thuần túy (`.txt`) để đảm bảo độ chính xác!",
            );
        }

        const rulesText = await FileHelper.readTextFromUrl(attachment.url);

        if (!rulesText || rulesText.length === 0) {
            return interaction.editReply(
                "❌ File bị rỗng hoặc hệ thống không thể đọc được nội dung.",
            );
        }

        await db.orm.public.Tournament.where({
            id: activeTournament.id,
        }).update({
            rules: rulesText,
        });

        await interaction.editReply(
            `✅ Cập nhật thành công! Trợ lý AI đã ghi nhớ toàn bộ thể lệ mới của giải **${activeTournament.name}**.`,
        );
    },
);
