import { registrationCache } from "@/events/modalSubmitInteractionCreate";
import { ResponseHelper } from "@/helpers/response";
import { button } from "@/layouts/component";
import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    type TextChannel,
} from "discord.js";

export default button(
    "confirm_reg",
    { everyone: false },
    async (client, interaction) => {
        const cacheKey = interaction.customId.replace("confirm_reg.", "");

        const data = registrationCache.get(cacheKey);

        const { db } = client;

        if (!data)
            throw new Error(
                "❌ Phiên đăng ký đã hết hạn hoặc bị lỗi. Vui lòng gõ `/register` làm lại.",
            );

        try {
            let newTeamId = "";

            await db.transaction(async (tx) => {
                const existingTeam = await tx.orm.public.Team.first({
                    name: data.teamName as string,
                });

                if (existingTeam)
                    throw Error(
                        `Tên đội **${data.teamName}** đã có người đăng ký. Vui lòng chọn tên khác!`,
                    );

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

            await ResponseHelper.sendSuccess(
                `Đội **${data.teamName}** đã được gửi lên BTC. Vui lòng đợi kết quả xét duyệt.`,
                { interaction },
            );

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
        } catch (err) {
            if (err instanceof Error) {
                ResponseHelper.sendError(err.message, { interaction });
                if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) {
                    console.error("[Command Handle Error]:", err);
                }
            }

            return false;
        }
    },
);
