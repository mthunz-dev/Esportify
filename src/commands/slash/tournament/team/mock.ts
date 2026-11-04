import { subsl } from "@/layouts/command";
import { SlashCommandSubcommandBuilder } from "discord.js";
import { ResponseHelper } from "@/helpers/response";
import { EmbedHelper } from "@/helpers/embed";
import MessageBuilder from "@/helpers/message-builder";
import { TeamService } from "@/services/team.service";

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
        await interaction.reply(
            new MessageBuilder()
                .setColor("Orange")
                .setDescription(`⌛ Đang tạo đội ảo...`)
                .build(),
        );
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

        const targetTeamCount = countInput || activeTournament.teamCount;

        const createdTeamCount = TeamService.createMockTeam(
            activeTournament.id,
            targetTeamCount,
            rosterSize,
        );

        if (!createdTeamCount)
            return await interaction.editReply({
                embeds: [
                    EmbedHelper.error(`Có lỗi trong quá trình tạo đội ảo !`),
                ],
            });

        await interaction.editReply({
            embeds: [
                EmbedHelper.success(
                    `Đã tạo thành công **${createdTeamCount} đội ảo** (mỗi đội **${rosterSize} tuyển thủ**) cho giải **${activeTournament.name}**!`,
                ),
            ],
        });
    },
);
