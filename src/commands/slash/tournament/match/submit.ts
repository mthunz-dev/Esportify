import { EmbedHelper } from "@/helpers/embed";
import MessageBuilder from "@/helpers/message-builder";
import { ResponseHelper } from "@/helpers/response";
import { subsl } from "@/layouts/command";
import { MatchService } from "@/services/match.service";
import { SlashCommandSubcommandBuilder } from "discord.js";
import ms from "ms";

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
                .setFileTypes("image")
                .setRequired(true),
        ),
    {
        global: true,
        ownerOnly: true,
        ignore: true,
    },
    async (client, interaction) => {
        await ResponseHelper.defer(interaction);

        const { guildId } = interaction;

        await ResponseHelper.send(
            EmbedHelper.loading(`Đang phân tích dữ liệu của trận đấu...`),
            { interaction },
        );

        const attachment = interaction.options.getAttachment("image", true);

        const activeTournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });
        if (!activeTournament)
            return ResponseHelper.sendError(
                `Chưa có giải đấu nào diễn ra trong máy chủ này!`,
                { interaction },
            );

        try {
            const { match, roundData } = await MatchService.previewResult(
                activeTournament.id,
                activeTournament.game,
                attachment.url,
            );

            const teamA = match.teamA!;
            const teamB = match.teamB!;

            const isTeamAWinner = roundData.winnerId === teamA.id;
            const teamAName = isTeamAWinner ? `${teamA.name} 🏆` : teamA.name;
            const teamBName = !isTeamAWinner ? `${teamB.name} 🏆` : teamB.name;

            // Xây dựng giao diện hiển thị Preview
            await ResponseHelper.send(
                new MessageBuilder()
                    .setTitle(
                        `🔍 Phân tích Ván đấu: ${teamA.name} vs ${teamB.name}`,
                    )
                    .setDescription(
                        `**Vòng đấu:** ${match.name} | **Thể thức:** BO${match.bestOf}\n\n` +
                            `📊 **Kết quả ván đấu (AI ghi nhận):**\n` +
                            `> **\`${teamAName}\`**: **${roundData.teamAPoint}**\n` +
                            `> **\`${teamBName}\`**: **${roundData.teamBPoint}**\n\n` +
                            `🏅 **MVP:** ${roundData.mvp.ign || "Không xác định"}\n` +
                            `⏱️ **Thời gian:** ${roundData.duration ? ms(roundData.duration * 1000) : "Không xác định"}`,
                    )
                    .setImage(attachment.url)
                    .setColor("Blue")
                    .addComponents([
                        {
                            type: 2,
                            customId: "confirm_submit",
                            label: "Xác nhận lưu",
                            style: 3,
                        },
                        {
                            type: 2,
                            customId: "cancel_submit",
                            label: "Huỷ bỏ",
                            style: 4,
                        },
                    ]),
                {
                    interaction,
                    components: {
                        allowedUsers: [interaction.user.id],
                        time: ms("1m"),
                        once: true,
                        onCollect: async (btnInteraction) => {
                            await btnInteraction.update({ components: [] });

                            if (btnInteraction.customId === "cancel_submit") {
                                return await interaction.editReply({
                                    content: `❌ Ván đấu đã bị huỷ`,
                                });
                            }

                            const msg = await btnInteraction.followUp({
                                embeds: [
                                    EmbedHelper.loading(
                                        `Đang lưu dữ liệu vào hệ thống và đối soát cây nhánh...`,
                                    ),
                                ],
                            });

                            try {
                                const { updatedMatch, isMatchFinished } =
                                    await MatchService.submitRound(
                                        match.id,
                                        roundData,
                                    );

                                let finalContent = `✅ **Đã lưu thành công ván đấu!**\n`;
                                finalContent += `Tỉ số tổng hiện tại (BO${match.bestOf}): **${teamA.name} ${updatedMatch!.teamAScore} - ${updatedMatch!.teamBScore} ${teamB.name}**\n`;

                                // Nếu chạm ngưỡng BO3/BO5, thông báo chuyển nhánh
                                if (isMatchFinished) {
                                    finalContent += `\n🏆 **TRẬN ĐẤU ĐÃ KẾT THÚC!**\nĐội chiến thắng đã được tự động đẩy vào vòng tiếp theo thành công.`;
                                }

                                await msg.edit({
                                    content: finalContent,
                                    embeds: [],
                                });
                            } catch (err: any) {
                                await btnInteraction.editReply(
                                    `❌ Có lỗi xảy ra khi lưu Database: ${err.message}`,
                                );
                            }
                        },
                    },
                },
            );
        } catch (err: any) {
            return ResponseHelper.sendError(
                err.message ||
                    "Đã xảy ra lỗi không xác định khi phân tích ảnh. Hãy thử lại!",
                { interaction },
            );
        }
    },
);
