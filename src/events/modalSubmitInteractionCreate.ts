import { ResponseHelper } from "@/helpers/response";
import event from "@/layouts/event";
import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    Events,
} from "discord.js";

export const registrationCache = new Map<string, any>();

export default event(
    Events.InteractionCreate,
    {
        once: false,
    },
    async (client, interaction) => {
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;
        if (!interaction.isModalSubmit()) return;

        // register modal
        if (interaction.customId.startsWith("register.")) {
            const tournamentId = interaction.customId.replace("register.", "");

            await interaction.deferReply();

            const teamName = interaction.fields
                .getTextInputValue("team_name")
                .trim();
            const rawPlayersText =
                interaction.fields.getTextInputValue("players_list");

            const allMembers = await interaction.guild.members.fetch();

            const lines = rawPlayersText
                .split("\n")
                .filter((line) => line.trim() !== "");
            const playersData: {
                discordId: string;
                ign: string;
                username: string;
            }[] = [];

            for (let i = 0; i < lines.length; i++) {
                const parts = lines[i].split("|");
                if (parts.length !== 2) {
                    return interaction.editReply(
                        `❌ Dòng ${i + 1} sai cú pháp. Phải là: \`username | ingame\`.`,
                    );
                }

                const usernameInput = parts[0].trim().toLowerCase();
                const ignInput = parts[1].trim();

                const member = allMembers.find(
                    (m) => m.user.username.toLowerCase() === usernameInput,
                );

                if (!member) {
                    return interaction.editReply(
                        `❌ Không tìm thấy người dùng \`${usernameInput}\` trong máy chủ này. Hãy đảm bảo họ đã tham gia máy chủ và gõ đúng username!`,
                    );
                }

                playersData.push({
                    discordId: member.id,
                    ign: ignInput,
                    username: member.user.username,
                });
            }

            const discordIdsToCheck = playersData.map((p) => p.discordId);
            const existingPlayers = await client.db.orm.public.Player.where(
                (p) => p.discordId.in(discordIdsToCheck),
            )
                .where((p) => p.team.some({ tournamentId }))
                .include("team")
                .all();

            if (existingPlayers.length > 0) {
                const conflictInfo = existingPlayers
                    .map((ep) => `<@${ep.discordId}> (Team: ${ep.team.name})`)
                    .join("\n");
                return interaction.editReply(
                    `❌ Đăng ký thất bại! Các thành viên sau đã thuộc một đội khác trong giải này:\n${conflictInfo}`,
                );
            }
            let summaryText = "";
            playersData.forEach((p, idx) => {
                summaryText += `${idx + 1}. <@${p.discordId}> - IGN: **${p.ign}**\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`Kiểm tra lại thông tin đội: ${teamName}`)
                .setColor("Orange")
                .setDescription(
                    `Vui lòng kiểm tra kỹ danh sách dưới đây. Nút xác nhận sẽ mở sau **10 giây**.\n\n${summaryText}`,
                );

            const cacheKey = `reg_${interaction.user.id}_${tournamentId}`;
            const confirmButton = new ButtonBuilder()
                .setCustomId(`confirm_reg.${cacheKey}`)
                .setEmoji("<a:10s:1562865127064211559>")
                .setLabel("Đang chờ...")
                .setStyle(2)
                .setDisabled(true);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                confirmButton,
            );

            await ResponseHelper.send(
                {
                    embeds: [embed],
                    components: [row],
                },
                {
                    interaction,
                    components: {
                        allowedUsers: [interaction.user.id],
                    },
                },
            );

            registrationCache.set(cacheKey, {
                teamName,
                tournamentId,
                playersData,
            });

            // setTimeout(async () => {
            //     const clickableConfirmButton = new ButtonBuilder()
            //         .setCustomId(`confirm_reg.${cacheKey}`)
            //         .setLabel("Xác nhận đăng ký")
            //         .setStyle(3)
            //         .setDisabled(false);

            //     const newRow =
            //         new ActionRowBuilder<ButtonBuilder>().addComponents(
            //             clickableConfirmButton,
            //         );

            //     try {
            //         await interaction.editReply({ components: [newRow] });
            //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
            //     } catch (e) {}
            // }, 500);
        }
    },
);
