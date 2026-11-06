// src/commands/tournament/dashboard.ts
import { subsl } from "@/layouts/command";
import { AttachmentBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { TournamentService } from "@/services/tournament.service";
import { ResponseHelper } from "@/helpers/response";
import { MatchService } from "@/services/match.service";
import { EmbedHelper } from "@/helpers/embed";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("dashboard")
        .setDescription("Hiển thị sơ đồ nhánh đấu của giải đấu hiện tại"),
    {
        global: true,
    },
    async (client, interaction) => {
        await ResponseHelper.defer(interaction);

        const { guildId } = interaction;

        // Lấy giải đấu đang active
        const tournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });

        if (!tournament) {
            return ResponseHelper.sendError(
                "Không có giải đấu nào đang diễn ra tại máy chủ này.",
                { interaction },
            );
        }

        // Kiểm tra xem đã vẽ chưa (tránh render lại không cần thiết nếu có chức năng cache sau này)

        await interaction.editReply({
            embeds: [EmbedHelper.loading("Đang vẽ sơ đồ nhánh đấu...")],
        });

        const groupStandingsData =
            await TournamentService.calculateGroupStandings(tournament.id);

        const groupMatchesData = await client.db.orm.public.Match.where({
            tournamentId: tournament.id,
            type: "GROUP_MATCH",
        })
            .include("teamA")
            .include("teamB")
            .all();

        // Gọi 2 hàm Render chạy SONG SONG (tối ưu tốc độ cực mạnh)
        const [standingsBuffer, matchesBuffer] = await Promise.all([
            TournamentService.generateGroupStandingsImage(groupStandingsData),
            TournamentService.generateGroupMatchesImage(groupMatchesData),
        ]);

        // Tạo 2 tệp đính kèm
        const standingsAttachment = new AttachmentBuilder(standingsBuffer, {
            name: "standings.png",
        });
        const matchesAttachment = new AttachmentBuilder(matchesBuffer, {
            name: "matches.png",
        });

        // Trả về Discord cùng lúc
        await interaction.editReply({
            content: `📊 **Dashboard Vòng Bảng** - Giải đấu: **${tournament.name}**`,
            files: [standingsAttachment, matchesAttachment], // Gửi cả 2 ảnh trong 1 cục
            embeds: [],
        });
    },
);
