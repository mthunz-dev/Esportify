import MessageBuilder from "@/helpers/message-builder";
import { ResponseHelper } from "@/helpers/response";
import event from "@/layouts/event";
import { Events } from "discord.js";

interface PlayerData {
    discordId: string;
    ign: string;
    username: string;
}

export const registrationCache = new Map<
    string,
    {
        teamName: string;
        tournamentId: string;
        playersData: PlayerData[];
    }
>();

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
        if (interaction.customId.startsWith("register_tournament.")) {
            const tournamentId = interaction.customId.replace(
                "register_tournament.",
                "",
            );

            await ResponseHelper.defer(interaction, true);

            const teamName = interaction.fields
                .getTextInputValue("team_name")
                .trim();
            const rawPlayersText =
                interaction.fields.getTextInputValue("players_list");

            const allMembers = await interaction.guild.members.fetch();

            const lines = rawPlayersText
                .split("\n")
                .filter((line) => line.trim() !== "");
            const playersData: PlayerData[] = [];

            for (let i = 0; i < lines.length; i++) {
                const parts = lines[i].split("|");
                if (parts.length !== 2) {
                    return ResponseHelper.sendError(
                        `Thông tin thành viên thứ ${i + 1} chưa đúng cú pháp. Bạn kiểm tra lại nhé !`,
                        { interaction, ephemeral: true },
                    );
                }

                const usernameInput = parts[0].trim().toLowerCase();
                const ignInput = parts[1].trim();

                const member = allMembers.find(
                    (m) => m.user.username.toLowerCase() === usernameInput,
                );

                if (!member) {
                    return await ResponseHelper.sendError(
                        `Không tìm thấy người dùng \`${usernameInput}\` trong máy chủ. Hãy đảm bảo họ đã tham gia máy chủ này và gõ đúng username`,
                        { interaction, ephemeral: true },
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
                .include("team")
                .where((p) => p.team.some({ tournamentId }))
                .all();

            if (existingPlayers.length > 0) {
                const conflictInfo = existingPlayers
                    .map(
                        (ep) =>
                            `- <@${ep.discordId}> - Team: **${ep.team.name}**`,
                    )
                    .join("\n");

                return await ResponseHelper.sendError(
                    `Đăng ký thất bại! Các thành viên sau đã thuộc một đội khác trong giải này:\n${conflictInfo}`,
                    { interaction, ephemeral: true },
                );
            }
            let playerList = "";
            playersData.forEach((p, idx) => {
                playerList += `ㅤㅤ ${idx + 1}. <@${p.discordId}> - **${p.ign}**\n`;
            });

            const cacheKey = `reg_${interaction.user.id}_${tournamentId}`;

            const message = new MessageBuilder()
                .setAuthor({
                    name: "Đăng ký tham gia giải đấu",
                    iconURL:
                        "https://cdn-icons-png.flaticon.com/128/10336/10336114.png",
                })
                .setColor("Blue")
                .setFields({
                    name: `ℹ️ Thông tin đội đăng ký`,
                    value: [
                        `- **\`Tên đội\`**: ${teamName}`,
                        `- **\`Thành viên đội\`**:`,
                        playerList,
                    ].join("\n"),
                })
                .addComponents([
                    {
                        type: 2,
                        customId: `confirm_reg.${cacheKey}`,
                        style: 3,
                        label: "Xác nhận đăng ký",
                        disabled: false,
                    },
                ])
                .setFooter({
                    iconURL: client.user.displayAvatarURL(),
                    text: client.user.displayName,
                })
                .setTimestamp()
                .addEmbeds()
                .setColor("Blue")
                .setDescription(
                    `Vui lòng kiểm tra kĩ thông tin trước khi xác nhận đăng ký`,
                )
                .setEphemeral(true);

            registrationCache.set(cacheKey, {
                teamName,
                tournamentId,
                playersData,
            });

            await ResponseHelper.send(message, {
                interaction,
                components: {
                    allowedUsers: [interaction.user.id],
                },
            });
        }
    },
);
