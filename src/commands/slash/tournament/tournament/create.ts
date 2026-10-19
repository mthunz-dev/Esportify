import subsl from "@/layouts/subsl";
import { SlashCommandSubcommandBuilder } from "discord.js";

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
        .addStringOption((o) =>
            o
                .setName("game")
                .setDescription("Game name")
                .setDescriptionLocalizations({ vi: "Tên tựa game" }) // sau này phát triển thành choices lấy từ danh sách module
                .setRequired(true),
        ),
    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        await interaction.deferReply();

        const name = interaction.options.getString("name", true);
        const game = interaction.options.getString("game", true);
        const { guildId } = interaction;

        const pendingTournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });

        if (pendingTournament)
            throw new Error("Đang có một giải đấu diễn ra trong máy chủ này rồi!");

        await client.db.orm.public.Tournament.create({
            name,
            game,
            guildId,
        });

        await interaction.editReply(
            `✅ Đã khởi tạo thành công giải đấu **${name}** bộ môn **${game.toUpperCase()}**! Các đội có thể bắt đầu nộp kết quả.`,
        );
    },
);
