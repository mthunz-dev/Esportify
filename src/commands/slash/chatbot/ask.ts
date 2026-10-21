import { slash } from "@/layouts/command";
import { AiService } from "@/services/ai.service";
import { SlashCommandBuilder } from "discord.js";

export default slash(
    new SlashCommandBuilder()
        .setName("ask")
        .setContexts(0)
        .setDescription(
            "Ask AI Assistant about rules and regulations of tournament",
        )
        .setDescriptionLocalizations({
            vi: "Hỏi Trợ lý AI mọi thắc mắc về luật lệ và thể lệ của giải đấu",
        })
        .addStringOption((o) =>
            o
                .setName("question")
                .setDescription(
                    "Your question (Eg: When is the final match start?)",
                )
                .setDescriptionLocalizations({
                    vi: "Câu hỏi của bạn (VD: Trận chung kết diễn ra khi nào?)",
                })
                .setRequired(true),
        ),
    {
        global: true,
        cooldown: "5s",
    },
    async (client, interaction) => {
        await interaction.deferReply({ flags: [64] });

        const question = interaction.options.getString("question", true);

        // 2. Tìm giải đấu đang Active
        const activeTournament = await client.db.orm.public.Tournament.first({
            guildId: interaction.guildId!,
            status: "ACTIVE",
        });

        // 3. Kiểm tra xem giải đấu có luật chưa
        if (!activeTournament || !activeTournament.rules) {
            return interaction.editReply(
                "❌ Hiện tại chưa có giải đấu nào đang diễn ra hoặc BTC chưa cập nhật thể lệ.",
            );
        }

        // 4. Chuyển logic sang AiService xử lý
        const answer = await AiService.resolveRuleQuery(
            question,
            activeTournament.rules,
            activeTournament.game,
        );

        if (!answer) {
            return interaction.editReply(
                "❌ Hệ thống AI đang bận xử lý giải đấu, vui lòng thử lại sau ít phút.",
            );
        }

        // 5. Trả kết quả ẩn cho riêng người dùng đó
        await interaction.editReply(
            `**❓ Câu hỏi:** ${question}\n\n**🤖 Trợ lý AI:**\n${answer}`,
        );
    },
);
