import { subsl } from "@/layouts/command";
import {
    EmbedBuilder,
    SlashCommandSubcommandBuilder,
    StringSelectMenuOptionBuilder,
    type APISelectMenuOption,
} from "discord.js";
import { getGameConfig, SupportedGames } from "@/modules/games";
import { ResponseHelper } from "@/helpers/response";
import MessageBuilder from "@/helpers/message-builder";
import { AiService } from "@/services/ai.service";
import { EmbedHelper } from "@/helpers/embed";
import ms from "ms";
import { TournamentFormat } from "@/types/enum";
import { TournamentService } from "@/services/tournament.service";

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
        .addStringOption((o) => {
            o.setName("game")
                .setDescription("Game name")
                .setDescriptionLocalizations({ vi: "Tên tựa game" })
                .setRequired(true);

            SupportedGames.forEach((game) => {
                o.addChoices({
                    value: game.id,
                    name: game.displayName,
                });
            });

            return o;
        })
        .addIntegerOption((o) =>
            o
                .setName("team-count")
                .setDescription("Number of teams")
                .setDescriptionLocalizations({
                    vi: "Số lượng đội chơi trong giải đấu",
                })
                .setMinValue(4)
                .setMaxValue(64)
                .setRequired(true),
        ),
    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        await ResponseHelper.defer(interaction);
        const { guildId } = interaction;

        const tournamentName = interaction.options.getString("name", true);
        const gameId = interaction.options.getString("game", true);
        const teamCount = interaction.options.getInteger("team-count", true);

        const pendingTournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });

        if (pendingTournament)
            return await ResponseHelper.sendError(
                `Đang có một giải đấu diễn ra trong máy chủ này rồi!`,
                { interaction },
            );

        const game = getGameConfig(gameId);

        if (!game)
            return await ResponseHelper.sendError(
                `Tựa game không hợp lệ, vui lòng kiểm tra lại`,
                { interaction },
            );

        const isSmallValid = [6, 10, 14].includes(teamCount);
        const isMultipleOf4 = teamCount % 4 === 0;

        if (!isSmallValid && !isMultipleOf4) {
            return await ResponseHelper.sendError(
                `Số lượng **${teamCount} đội** không thể chia bảng một cách công bằng. Vui lòng điều chỉnh số lượng đội tham gia thành các con số hợp lý hơn như: 16, 20, 24, 32... để AI có thể thiết kế giải đấu hoàn hảo nhất!`,
                { interaction },
            );
        }

        const sentMessage = await ResponseHelper.send(
            new MessageBuilder()
                .setColor("Yellow")
                .setDescription(
                    `🔎 Bạn đợi chút, AI đang phân tích và đưa ra đề xuất cho bạn`,
                ),
            {
                interaction,
                components: {
                    allowedUsers: [interaction.user.id],
                    time: ms("2m"),
                    onCollect: async (_interaction) => {
                        if (!_interaction.inCachedGuild()) return;

                        let parts: string[] = [];

                        if (_interaction.isStringSelectMenu()) {
                            parts = _interaction.values[0].split(".");
                        } else if (_interaction.isButton()) {
                            parts = _interaction.customId.split(".");
                            parts.shift();
                        }
                        const formatType = parts[0] as TournamentFormat;
                        const groupCount = parseInt(parts[1]);
                        const advancePerGroup = parseInt(parts[2]);

                        const teamsPerGroup = teamCount
                            ? teamCount / groupCount
                            : 0;

                        if (_interaction.isStringSelectMenu()) {
                            const selectedValue = _interaction.values[0];

                            const formatText = [
                                `ㅤㅤ • **\`Hình thức\`**: ` +
                                    (formatType === TournamentFormat.GroupStage
                                        ? "Chia bảng đấu"
                                        : "Loại trực tiếp"),
                            ];

                            if (formatType === TournamentFormat.GroupStage) {
                                formatText.push(
                                    `ㅤㅤ • **\`Cấu trúc bảng đấu\`**: ${groupCount} Bảng x ${teamsPerGroup} Đội`,
                                    `ㅤㅤ •  **\`Vòng loại\`**: Lấy **Top ${advancePerGroup}** của các bảng đấu`,
                                );
                            }

                            const message = new MessageBuilder()
                                .setColor("Blue")
                                .setTitle("XÁC NHẬN TẠO GIẢI ĐẤU")
                                .setFields(
                                    {
                                        name: `ℹ️ Thông tin giải đấu`,
                                        value: [
                                            `ㅤㅤ • **\`Tên giải đấu\`**: ${tournamentName}`,
                                            `ㅤㅤ • **\`Số lượng đội chơi:\`** ${teamCount}`,
                                            `ㅤㅤ • **\`Tựa game\`**: ${game.displayName.toUpperCase()}`,
                                        ].join("\n"),
                                    },
                                    {
                                        name: `⚙️ Cách thức tổ chức`,
                                        value: formatText.join("\n"),
                                    },
                                )
                                .setFooter({
                                    text: client.user.displayName,
                                    iconURL: client.user.displayAvatarURL(),
                                })
                                .setTimestamp()
                                .addComponents([
                                    {
                                        type: 2,
                                        customId: `confirm_create_tournament.${selectedValue}`,
                                        label: "Xác nhận",
                                        style: 3,
                                        disabled: false,
                                    },
                                ]);

                            await _interaction.update(message.build());
                        } else if (_interaction.isButton()) {
                            await _interaction.update({
                                embeds: [
                                    EmbedBuilder.from(
                                        _interaction.message.embeds[0],
                                    ),
                                ],
                                components: [],
                            });

                            const sentMessage = await _interaction.followUp(
                                new MessageBuilder()
                                    .setColor("Orange")
                                    .setDescription(
                                        `⌛ Đang tạo giải đấu và các trận đấu...`,
                                    )
                                    .build(),
                            );

                            const createdMatches =
                                await TournamentService.createWithFormat({
                                    guildId,
                                    gameId,
                                    format: formatType,
                                    name: tournamentName,
                                    teamCount,
                                    groupOption: {
                                        advancePerGroup,
                                        groupCount,
                                    },
                                });

                            if (!createdMatches)
                                return await sentMessage.edit({
                                    embeds: [
                                        EmbedHelper.error(
                                            `Có lỗi xảy ra trong quá trình tạo giải đấu, vui lòng thử lại sau!`,
                                        ),
                                    ],
                                });

                            await sentMessage.edit({
                                embeds: [
                                    EmbedHelper.success(
                                        [
                                            `Tạo thành công giải đấu và **${createdMatches}** trận đấu của giải`,
                                            `✔️ Sử dụng lệnh /tournament set-rule để đặt thể lệ cho giải đấu`,
                                        ].join("\n"),
                                    ),
                                ],
                            });
                        }
                    },
                },
            },
        );

        const aiRespone = await AiService.suggestTournamentFormat(teamCount);

        if (!aiRespone)
            return await sentMessage.edit({
                embeds: [
                    EmbedHelper.error(
                        `AI đang bị quá tải, vui lòng thử lại sau`,
                    ),
                ],
            });

        const suggestionsText: string[] = [];
        const suggestionsOptions: APISelectMenuOption[] = [];

        aiRespone.suggestions
            .sort(
                (a, b) =>
                    a.groupCount &&
                    b.groupCount &&
                    teamCount / a.groupCount - teamCount / b.groupCount,
            )
            .forEach((s, idx) => {
                const text = `ㅤㅤ${idx + 1}. **\`${s.label}\`**`;
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(s.label)
                    .setDescription(
                        s.description.slice(0, 97) +
                            (s.description.length > 97 ? "..." : ""),
                    )
                    .setEmoji(`💠`)
                    .setValue(
                        `${s.formatType}.${s.groupCount}.${s.advancePerGroup}`,
                    )
                    .toJSON();

                suggestionsText.push(text);
                suggestionsOptions.push(option);
            });

        const message = new MessageBuilder()
            .setTitle("TẠO GIẢI ĐẤU MỚI")
            .setColor("Blue")
            .setFields(
                {
                    name: `ℹ️ Thông tin giải đấu`,
                    value: [
                        `ㅤㅤ • **\`Tên giải đấu\`**: ${tournamentName}`,
                        `ㅤㅤ • **\`Số lượng đội chơi:\`** ${teamCount}`,
                        `ㅤㅤ • **\`Tựa game\`**: ${game.displayName.toUpperCase()}`,
                    ].join("\n"),
                },
                {
                    name: `🔎 Đề xuất cách tổ chức`,
                    value: suggestionsText.join("\n"),
                },
            )
            .setFooter({
                text: client.user.displayName,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp()
            .addComponents([
                {
                    type: 3,
                    customId: `select_tournament_format`,
                    placeholder: "Lựa chọn cách thức tổ chức giải đấu",
                    options: suggestionsOptions,
                },
            ]);

        await sentMessage.edit(message.build());

        // const ruleFile = interaction.options.getAttachment("rule_file");

        // let rules = null;

        // if (ruleFile) {
        //     if (
        //         !ruleFile.name.endsWith(".txt") &&
        //         !ruleFile.contentType?.includes("text/plain")
        //     ) {
        //         return interaction.editReply(
        //             "❌ Vui lòng chỉ sử dụng file định dạng `.txt` cho thể lệ!",
        //         );
        //     }

        //     rules = await FileHelper.readTextFromUrl(ruleFile.url);
        // }

        // await client.db.orm.public.Tournament.create({
        //     name,
        //     game,
        //     rules,
        //     guildId,
        // });

        // const ruleStatus = rules
        //     ? "✅ Đã nạp thành công file thể lệ."
        //     : "⚠️ Chưa có thể lệ. Hãy dùng lệnh `/tournament set-rule` sau.";

        // await interaction.editReply(
        //     `✅ Đã khởi tạo thành công giải đấu **${name}** bộ môn **${game.toUpperCase()}**!\n${ruleStatus}`,
        // );
    },
);
