import { EmbedHelper } from "@/helpers/embed";
import { ResponseHelper } from "@/helpers/response";
import { subsl } from "@/layouts/command";
import { getGameConfig } from "@/modules/games";
import { MatchService } from "@/services/match.service";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { AttachmentBuilder, SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("mock")
        .setDescription(`Create a mock match result`)
        .setDescriptionLocalizations({ vi: "Tạo kết quả trận đấu ảo" })
        .addStringOption((o) =>
            o
                .setName("match")
                .setDescription("Match to create mock result")
                .setDescriptionLocalizations({
                    vi: "Trận đấu cần tạo kết quả ảo",
                })
                .setAutocomplete(true)
                .setRequired(true),
        ),
    {
        global: true,
    },
    async (client, interaction) => {
        await ResponseHelper.defer(interaction);

        const matchId = interaction.options.getString("match", true);

        // 1. Lấy thông tin Match kèm Roster (Tuyển thủ)
        const match = await client.db.orm.public.Match.where({ id: matchId })
            .include("teamA", (t) => t.include("players"))
            .include("teamB", (t) => t.include("players"))
            .include("tournament")
            .first();

        if (!match) {
            return ResponseHelper.sendError("Không tìm thấy trận đấu này!", {
                interaction,
            });
        }

        const gameConfig = getGameConfig(match.tournament.game);
        if (!gameConfig) {
            return ResponseHelper.sendError(
                `Hệ thống chưa hỗ trợ game ${match.tournament.game}.`,
                { interaction },
            );
        }

        await ResponseHelper.send(
            EmbedHelper.loading(`Đang khởi tạo dữ liệu và render hình ảnh giả lập...
`),
            { interaction },
        );

        try {
            // 2. Sinh dữ liệu giả (Mock Data)
            const mockData = MatchService.generateMock(
                match as any,
                gameConfig,
            );

            // 3. Render ảnh Base với Canvas
            const imageBuffer = await MatchService.renderMockImage(mockData);

            // 4. Tạo file Attachment Discord
            const attachment = new AttachmentBuilder(imageBuffer, {
                name: `mock-result-${match.id}.png`,
            });

            // 5. Gửi ảnh về lại Discord
            await ResponseHelper.send(
                {
                    files: [attachment],
                    embeds: [
                        EmbedHelper.success(
                            `Đã tạo thành công ảnh giả lập cho trận: **${match.teamA!.name} 🆚 ${match.teamB!.name}**\n*Hãy lưu ảnh này lại và dùng cho lệnh \`/match submit\` để test hệ thống.*`,
                        ),
                    ],
                },
                { interaction },
            );
        } catch (error: any) {
            console.error("Mock Generator Error:", error);
            await ResponseHelper.sendError(
                `Có lỗi xảy ra khi tạo ảnh: ${error.message}`,
                { interaction },
            );
        }
    },
    async (client, interaction) => {
        const { guildId } = interaction;
        const tournament = await client.db.orm.public.Tournament.first({
            guildId,
        });

        if (!tournament) return;

        const focusedValue = interaction.options.getFocused();

        const matchList = await client.db.orm.public.Match.where({
            tournamentId: tournament.id,
        })
            .where((m) =>
                and(
                    m.status.in(["PENDING", "ONGOING"]),
                    m.teamAId.isNotNull(),
                    m.teamBId.isNotNull(),
                ),
            )
            .where((m) =>
                focusedValue
                    ? or(
                          m.teamA.some((t) => t.name.ilike(`${focusedValue}%`)),
                          m.teamB.some((t) => t.name.ilike(`${focusedValue}%`)),
                      )
                    : m.id.isNotNull(),
            )
            .include("teamA")
            .include("teamB")
            .limit(25)
            .all();

        await interaction.respond(
            matchList.map((m) => {
                const name = `[${m.name}]: ${m.teamA!.name} 🆚 ${m.teamB!.name}`;

                return {
                    name:
                        name.length > 100
                            ? name.substring(0, 97) + "..."
                            : name,
                    value: m.id,
                };
            }),
        );
    },
);
