import { FileHelper } from "@/helpers/file";
import { subsl } from "@/layouts/command";
import { hyperlink, SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("set-rule")
        .setDescription("Establish rule for the tournament")
        .setDescriptionLocalizations({ vi: "Thiết lập thể lệ cho giải đấu" })
        .addAttachmentOption((o) =>
            o
                .setName("rule-file")
                .setDescription("Rule of the tournament (.txt format)")
                .setFileTypes(".txt")
                .setDescriptionLocalizations({
                    vi: "Thể lệ của giải đấu (định dạng file .txt)",
                })
                .setRequired(true),
        )
        .addStringOption((o) =>
            o
                .setName("rule-url")
                .setDescription("URL to tournment's rules")
                .setDescriptionLocalizations({
                    vi: "Đường link tới file thể lệ",
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

        const attachment = interaction.options.getAttachment("rule-file", true);
        const ruleUrl = interaction.options.getString("rule-url", true);

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
            rulesURL: ruleUrl,
        });

        await interaction.editReply(
            `✅ Cập nhật thành công! Trợ lý AI đã ghi nhớ toàn bộ thể lệ mới của giải **${activeTournament.name}** và đường link truy cập: ${hyperlink("THỂ LỆ", ruleUrl)}.`,
        );
    },
);
