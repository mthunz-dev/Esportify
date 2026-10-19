import MessageBuilder from "@/helpers/MessageBuilder";
import subsl from "@/layouts/subsl";
import { AiService } from "@/services/ai.service";
import { SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("submit")
        .setDescription("Submit match result to AI to analysis")
        .setDescriptionLocalizations({ vi: "Gửi kết quả trận đấu cho AI để phân tích" })
        .addAttachmentOption((o) =>
            o
                .setName("image")
                .setDescription("Screenshot of the match result")
                .setDescriptionLocalizations({ vi: "Ảnh chụp màn hình kết quả trận đấu" })
                .setRequired(true),
        ),
    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment("image", true);

        if (!attachment.contentType?.startsWith("image/"))
            throw new Error("Vui lòng đính kèm một file hình ảnh hợp lệ (PNG, JPG)");

        const matchData = await AiService.analyzeMatchImage(attachment.url, attachment.contentType);

        if (!matchData) throw new Error("AI không thể đọc được ảnh này. Vui lòng chụp rõ nét hơn");

        const msg = new MessageBuilder()
            .setTitle("🤖 Trọng Tài AI Đã Phân Tích Xong")
            .setColor("Blue")
            .setImage(attachment.url)
            .setFields(
                {
                    name: `🛡️ ${matchData.teamAName}`,
                    value: `Điểm: **${matchData.teamAScore}**`,
                    inline: true,
                },
                { name: "VS", value: "⚔️", inline: true },
                {
                    name: `🛡️ ${matchData.teamBName}`,
                    value: `Điểm: **${matchData.teamBScore}**`,
                    inline: true,
                },
            )
            .setFooter({ text: "Dữ liệu chuẩn bị được lưu vào Database..." });

        await interaction.editReply(msg.options);
    },
);
