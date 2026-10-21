import { registrationCache } from "@/events/modalSubmitInteractionCreate";
import { button } from "@/layouts/component";
import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    type TextChannel,
} from "discord.js";

export default button(
    "confirm_reg",
    {
        everyone: true,
    },
    async (client, interaction) => {
        const cacheKey = interaction.customId.replace("confirm_reg", "");
        const data = registrationCache.get(cacheKey);
        const { db } = client;

        if (!data) {
            return interaction.followUp({
                content:
                    "❌ Phiên đăng ký đã hết hạn hoặc bị lỗi. Vui lòng gõ `/register` làm lại.",
                flags: [64],
            });
        }

        try {
            let newTeamId = "";

            await db.transaction(async (tx) => {
                // 1. Tạo Team
                const newTeam = await tx.orm.public.Team.create({
                    name: data.teamName,
                    tournamentId: data.tournamentId,
                    status: "PENDING",
                });

                newTeamId = newTeam.id;

                const playersToInsert = data.playersData.map((p: any) => ({
                    discordId: p.discordId,
                    ign: p.ign,
                    teamId: newTeam.id,
                }));

                const plan = tx.sql.public.player
                    .insert(playersToInsert)
                    .build();
                await tx.execute(plan);
            });

            const successEmbed = new EmbedBuilder()
                .setTitle("✅ Gửi đơn đăng ký thành công")
                .setColor("Green")
                .setDescription(
                    `Đội **${data.teamName}** đã được gửi lên BTC. Vui lòng đợi kết quả xét duyệt.`,
                );

            await interaction.editReply({
                embeds: [successEmbed],
                components: [],
            });

            const adminChannel = interaction.client.channels.cache.get(
                "1562389938496864327",
            ) as TextChannel;

            const playerMentions = data.playersData
                .map((p: any) => `<@${p.discordId}> (IGN: ${p.ign})`)
                .join("\n");
            const adminEmbed = new EmbedBuilder()
                .setTitle("🚨 ĐƠN ĐĂNG KÝ ĐỘI MỚI")
                .setColor("Yellow")
                .addFields(
                    { name: "Tên đội", value: data.teamName },
                    {
                        name: "Đội trưởng nộp đơn",
                        value: `<@${interaction.user.id}>`,
                    },
                    { name: "Thành viên", value: playerMentions },
                );

            const adminRow =
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `approve_${newTeamId}_${interaction.user.id}`,
                        )
                        .setLabel("Duyệt")
                        .setStyle(3),
                    new ButtonBuilder()
                        .setCustomId(
                            `reject_${newTeamId}_${interaction.user.id}`,
                        )
                        .setLabel("Từ chối")
                        .setStyle(4),
                );

            await adminChannel.send({
                embeds: [adminEmbed],
                components: [adminRow],
            });
            registrationCache.delete(cacheKey);
        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content:
                    "❌ Có lỗi xảy ra khi lưu vào Database (Có thể tên đội đã tồn tại).",
                components: [],
            });
        }
    },
);
