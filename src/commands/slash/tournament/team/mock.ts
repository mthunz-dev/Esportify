import { subsl } from "@/layouts/command";
import { SlashCommandSubcommandBuilder } from "discord.js";
import { ResponseHelper } from "@/helpers/response";
import { EmbedHelper } from "@/helpers/embed";

const ADJECTIVES = [
    "Apex",
    "Cyber",
    "Phantom",
    "Vortex",
    "Crimson",
    "Shadow",
    "Omega",
    "Immortal",
];
const NOUNS = [
    "Dragons",
    "Knights",
    "Titans",
    "Ninjas",
    "Spirits",
    "Vipers",
    "Phoenix",
    "Lords",
];

function generateTeamName(index: number): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj} ${noun} #${index + 1}`;
}

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("mock")
        .setDescription("Generate mock teams for testing")
        .setDescriptionLocalizations({
            vi: "Sinh ngẫu nhiên số lượng đội chơi ảo để test giải đấu",
        })
        .addIntegerOption((o) =>
            o
                .setName("count")
                .setDescription(
                    "Number of teams to create (Default: Number of teams in the tournament)",
                )
                .setDescriptionLocalizations({
                    vi: "Số lượng đội muốn tạo (Mặc định: Tạo đủ số đội của giải)",
                })
                .setMinValue(2)
                .setMaxValue(64)
                .setRequired(false),
        )
        .addIntegerOption((o) =>
            o
                .setName("roster-size")
                .setDescription(`Number of members per team (Default: 5)`)
                .setDescriptionLocalizations({
                    vi: "Số lượng thành viên mỗi đội (Mặc định: 5)",
                })
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false),
        ),
    { global: true, ownerOnly: true },
    async (client, interaction) => {
        await ResponseHelper.defer(interaction);
        const { guildId } = interaction;

        const activeTournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });

        if (!activeTournament) {
            return await ResponseHelper.sendError(
                "Không có giải đấu nào đang diễn ra để seed đội!",
                { interaction },
            );
        }

        const countInput = interaction.options.getInteger("count");
        const rosterSize = interaction.options.getInteger("roster-size") || 5;

        // Nếu không nhập count, mặc định sinh đủ số lượng đội giải yêu cầu (hoặc 8 đội)
        const targetTeamCount = countInput || 8;

        // 2. Chạy Transaction sinh dữ liệu hàng loạt
        const timestamp = Date.now();

        await client.db.transaction(async (tx) => {
            for (let i = 0; i < targetTeamCount; i++) {
                const teamName = generateTeamName(i);

                // Tạo Team
                const team = await tx.orm.public.Team.create({
                    tournamentId: activeTournament.id,
                    name: teamName,
                    tag: `MOCK${i + 1}`,
                });

                // Tạo Roster Players cho Team
                const playersData = Array.from(
                    { length: rosterSize },
                    (_, pIdx) => ({
                        teamId: team.id,
                        discordId: `MOCK_${timestamp}_${i + 1}_${pIdx + 1}`, // Discord ID ảo đánh dấu rõ ràng
                        ign: `Player_${i + 1}_${pIdx + 1}`,
                        isCaptain: pIdx === 0, // Tuyển thủ đầu tiên làm Đội trưởng
                    }),
                );

                await tx.orm.public.Player.createAll(playersData);
            }
        });

        await ResponseHelper.send(
            EmbedHelper.success(
                `✅ Đã sinh thành công **${targetTeamCount} đội ảo** (mỗi đội **${rosterSize} tuyển thủ**) cho giải **${activeTournament.name}**!`,
            ),
            { interaction },
        );
    },
);
