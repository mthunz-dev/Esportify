import MessageBuilder from "@/helpers/message-builder";
import { subsl } from "@/layouts/command";
import { getGameConfig } from "@/modules/games";
import { AiService } from "@/services/ai.service";
import { SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("submit")
        .setDescription("Submit match result to AI to analysis")
        .setDescriptionLocalizations({
            vi: "Gửi kết quả trận đấu cho AI để phân tích",
        })
        .addAttachmentOption((o) =>
            o
                .setName("image")
                .setDescription("Screenshot of the match result")
                .setDescriptionLocalizations({
                    vi: "Ảnh chụp màn hình kết quả trận đấu",
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
        await interaction.editReply(
            "⏳ Trọng tài AI đang quét ảnh và tìm kiếm Ingame tuyển thủ...",
        );

        const attachment = interaction.options.getAttachment("image", true);

        if (!attachment.contentType?.startsWith("image/"))
            return interaction.editReply(
                "❌ Vui lòng đính kèm một file hình ảnh hợp lệ (PNG, JPG)",
            );

        const activeTournament = await db.orm.public.Tournament.first({
            guildId: interaction.guildId!,
            status: "ACTIVE",
        });

        if (!activeTournament) {
            return interaction.editReply(
                "❌ Không có giải đấu nào đang diễn ra. Hãy yêu cầu BTC chạy lệnh `/tournament create`.",
            );
        }

        const gameConfig = getGameConfig(activeTournament.game);

        if (!gameConfig) {
            return interaction.editReply(
                "❌ Game của giải đấu không tồn tại, vui lòng kiểm tra lại hệ thống !",
            );
        }

        const t = Date.now();

        const matchData = await AiService.analyzeMatchImage(
            attachment.url,
            attachment.contentType,
            gameConfig,
        );

        if (!matchData)
            return interaction.editReply(
                "❌ AI không thể đọc được ảnh này. Vui lòng chụp rõ nét hơn",
            );

        const teamA = await db.orm.public.Team.where({
            tournamentId: activeTournament.id,
        })
            .where((t) =>
                t.players.some((p) => p.ign.in(matchData.teamAPlayers)),
            )
            .first();

        // Tìm Đội B
        const teamB = await db.orm.public.Team.where({
            tournamentId: activeTournament.id,
        })
            .where((t) =>
                t.players.some((p) => p.ign.in(matchData.teamBPlayers)),
            )
            .first();

        if (!teamA || !teamB) {
            return interaction.editReply(
                "❌ Không thể xác định được hai đội trong ảnh. Vui lòng kiểm tra lại Ingame hoặc đảm bảo BTC đã thêm đủ đội.",
            );
        }

        if (teamA.id === teamB.id) {
            return interaction.editReply(
                "❌ Lỗi dữ liệu: AI nhận diện cả hai bên đều thuộc cùng một Đội.",
            );
        }

        let winnerId = null;
        if (matchData.teamAScore > matchData.teamBScore) winnerId = teamA.id;
        else if (matchData.teamBScore > matchData.teamAScore)
            winnerId = teamB.id;

        await db.transaction(async (tx) => {
            const updateA = db.raw.sql`
    UPDATE "team" SET "totalScore" = "totalScore" + ${matchData.teamAScore}
    WHERE id = ${teamA.id}
  `

                .affectedCount()
                .build();

            const updateB = db.raw.sql`
    UPDATE "team" SET "totalScore" = "totalScore" + ${matchData.teamBScore}
    WHERE id = ${teamB.id}
  `
                .affectedCount()
                .build();

            await tx.execute(updateA);
            await tx.execute(updateB);
        });

        await db.orm.public.Match.create({
            tournamentId: activeTournament.id,
            teamAId: teamA.id,
            teamBId: teamB.id,
            teamAScore: matchData.teamAScore,
            teamBScore: matchData.teamBScore,
            winnerId: winnerId,
            proofImage: attachment.url,
        });

        const msg = new MessageBuilder()
            .setContent(`Thời gian phân tích: ${Date.now() - t}ms`)
            .setTitle("🤖 Phân Tích Hoàn Tất & Đã Lưu Database")
            .setColor("Green")
            .setImage(attachment.url)
            .addFields(
                {
                    name: `🛡️ ${teamA.name}`,
                    value: `Điểm: **${matchData.teamAScore}**`,
                    inline: true,
                },
                { name: "VS", value: "⚔️", inline: true },
                {
                    name: `🛡️ ${teamB.name}`,
                    value: `Điểm: **${matchData.teamBScore}**`,
                    inline: true,
                },
            )
            .setFooter({
                text: "Sử dụng lệnh /leaderboard để xem bảng xếp hạng cập nhật!",
            });

        await interaction.editReply(msg.build());
    },
);
