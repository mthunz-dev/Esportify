import { registrationCache } from "@/events/modalSubmitInteractionCreate";
import MessageBuilder from "@/helpers/message-builder";
import { ResponseHelper } from "@/helpers/response";
import { button } from "@/layouts/component";
import { AiService } from "@/services/ai.service";
import { type TextChannel } from "discord.js";

export default button(
    "confirm_reg",
    { everyone: false },
    async (client, interaction) => {
        const cacheKey = interaction.customId.replace("confirm_reg.", "");

        const data = registrationCache.get(cacheKey);
        await interaction.editReply({ components: [] });

        const { db } = client;

        if (!data)
            throw new Error(
                "❌ Phiên đăng ký đã hết hạn hoặc bị lỗi. Vui lòng gõ `/register` làm lại.",
            );

        const playerNames = data.playersData.map((p) => p.ign);
        const safetyCheck = await AiService.validateRosterSafety(
            data.teamName,
            playerNames,
        );

        if (
            safetyCheck.isTeamNameToxic ||
            safetyCheck.toxicPlayers.length > 0
        ) {
            let errorMessage = `Đội của bạn đã bị tự động từ chối do vi phạm tiêu chuẩn cộng đồng\n`;

            if (safetyCheck.isTeamNameToxic) {
                errorMessage += `- Tên đội **~~"${data.teamName}"~~** không phù hợp.\n`;
            }

            if (safetyCheck.toxicPlayers.length > 0) {
                errorMessage += `- Tên thành viên không hợp lệ: **${safetyCheck.toxicPlayers.map((p) => `~~${p}~~`).join(", ")}**\n`;
            }

            errorMessage +=
                "\n*Vui lòng sử dụng ngôn từ văn minh và thử đăng ký lại.*";

            return await ResponseHelper.sendError(errorMessage, {
                interaction,
                ephemeral: true,
            });
        }

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

                const playersToCreate = data.playersData.map((p: any) => ({
                    discordId: p.discordId,
                    ign: p.ign,
                    teamId: newTeam.id,
                }));

                await tx.orm.public.Player.createAll(playersToCreate);
            });

            await ResponseHelper.sendSuccess(
                `Đơn đăng ký của đội **${data.teamName}** đã được gửi lên BTC. Vui lòng đợi kết quả xét duyệt.`,
                { interaction, ephemeral: true },
            );

            const adminChannel = interaction.client.channels.cache.get(
                "1562389938496864327",
            ) as TextChannel;

            const captainId = data.playersData[0].discordId;

            const playerMentions = data.playersData
                .map(
                    (p, idx) =>
                        `${idx + 1}. <@${p.discordId}> - ${p.ign}` +
                        (p.discordId === captainId ? ` [Đội trưởng]` : ""),
                )
                .join("\n");
            const message = new MessageBuilder()
                .setAuthor({
                    name: "Đơn đăng ký đội mới",
                    iconURL:
                        "https://cdn-icons-png.flaticon.com/128/10336/10336114.png",
                })
                .setFields(
                    {
                        name: `📝 Tên đội`,
                        value: data.teamName,
                    },
                    {
                        name: `👤 Thành viên [${playerNames.length}]`,
                        value: playerMentions,
                    },
                )
                .setColor("Yellow")
                .addComponents([
                    {
                        type: 2,
                        customId: `approve_reg.${newTeamId}.${captainId}`,
                        label: "Duyệt",
                        style: 3,
                    },
                    {
                        type: 2,
                        customId: `reject_reg.${newTeamId}.${captainId}`,
                        label: "Từ chối",
                        style: 4,
                    },
                ])
                .setFooter({
                    iconURL: client.user.displayAvatarURL(),
                    text: client.user.displayName,
                })
                .setTimestamp()
                .build();

            await ResponseHelper.send(message, {
                channel: adminChannel,
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
