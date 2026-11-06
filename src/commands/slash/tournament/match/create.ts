import MessageBuilder from "@/helpers/message-builder";
import { ResponseHelper } from "@/helpers/response";
import { subsl } from "@/layouts/command";
import { or } from "@prisma/orm-postgres/orm-client";
import { SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("create")
        .setDescription(`Create new match`)
        .setDescriptionLocalizations({ vi: "Tạo trận đấu mới" })
        .addStringOption((o) =>
            o
                .setName("team-a")
                .setDescription("Team A")
                .setDescriptionLocalizations({ vi: "Đội chơi A" })
                .setAutocomplete(true)
                .setRequired(true),
        )
        .addStringOption((o) =>
            o
                .setName("team-b")
                .setDescription("Team B")
                .setDescriptionLocalizations({ vi: "Đội chơi B" })
                .setAutocomplete(true)
                .setRequired(true),
        )
        .addIntegerOption((o) =>
            o
                .setName("round-count")
                .setDescription("Number of rounds in match")
                .setDescriptionLocalizations({
                    vi: "Số lượng ván đấu trong trận",
                })
                .setRequired(true),
        ),

    {
        global: true,
    },

    async (client, interaction) => {
        await ResponseHelper.defer(interaction);

        // const { guildId } = interaction;
        const teamAValue = interaction.options.getString("team-a", true);
        const teamBValue = interaction.options.getString("team-b", true);
        const roundCount = interaction.options.getInteger("round-count", true);

        // const tournament = await client.db.orm.public.Tournament.first({
        //     guildId,
        // });

        // if (!tournament)
        //     return await ResponseHelper.sendError(
        //         `Chưa có giải đấu nào đang diễn ra trong máy chủ này`,
        //         { interaction },
        //     );

        const teamA = await client.db.orm.public.Team.first((t) =>
            or(t.name.ilike(teamAValue), t.id.ilike(teamAValue)),
        );
        const teamB = await client.db.orm.public.Team.first((t) =>
            or(t.name.ilike(teamBValue), t.id.ilike(teamBValue)),
        );

        if (!teamA)
            return await ResponseHelper.sendError("Đội chơi A không tồn tại!", {
                interaction,
            });
        if (!teamB)
            return await ResponseHelper.sendError("Đội chơi B không tồn tại!", {
                interaction,
            });

        await client.db.orm.public.Match.create({
            tournamentId: teamA.tournamentId,
            teamAId: teamA.id,
            teamBId: teamB.id,
            bestOf: roundCount,
            name: `${teamA.name}:${teamB.name}`,
            type: "FINAL",
        });

        await ResponseHelper.send(
            new MessageBuilder()
                .setColor("Green")
                .setDescription(
                    [
                        `✅ Tạo trận đấu thành công`,
                        `✔️ Sử dụng lệnh \`/match submit\` để tải lên kết quả trận đấu`,
                    ].join("\n"),
                ),
            {
                interaction,
            },
        );
    },
    async (client, interaction) => {
        const { guildId } = interaction;

        const tournament = await client.db.orm.public.Tournament.first({
            guildId,
        });
        if (!tournament) return;

        const focusedOption = interaction.options.getFocused(true);

        let teamList = await client.db.orm.public.Team.where((t) =>
            t.name.like(`${focusedOption.value}%`),
        )
            .limit(26)
            .all();

        if (focusedOption.name === "team-a") {
            const teamBvalue = interaction.options.getString("team-b");

            if (teamBvalue)
                teamList = teamList.filter(
                    (t) => t.name !== teamBvalue && t.id !== teamBvalue,
                );
        } else {
            const teamAValue = interaction.options.getString("team-a");

            if (teamAValue)
                teamList = teamList.filter(
                    (t) => t.name !== teamAValue && t.id !== teamAValue,
                );
        }

        if (teamList.length > 25) teamList.pop();

        await interaction.respond(
            teamList.map((t) => ({ name: t.name, value: t.id })),
        );
    },
);
