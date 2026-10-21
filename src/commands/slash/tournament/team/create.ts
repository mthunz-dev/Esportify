import { subsl } from "@/layouts/command";
import {
    LabelBuilder,
    ModalBuilder,
    SlashCommandSubcommandBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    UserSelectMenuBuilder,
} from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("create")
        .setDescription("Create new team")
        .setDescriptionLocalizations({ vi: "Tạo đội thi đấu mới" })
        .addStringOption((o) =>
            o
                .setName("name")
                .setDescription("Team name (Eg: T1, GAM Esports)")
                .setDescriptionLocalizations({
                    vi: "Tên đội thi đấu (VD: T1, GAM Esports)",
                })
                .setMaxLength(50)
                .setRequired(true),
        )

        // mỗi lần tạo và bắt đầu giải mới thì slash command sẽ được sửa lại theo số lượng thành viên yêu cầu của tựa game hiện tại rồi đẩy lại API của Discord, người dùng chỉ cần reload lại Discord là được

        .addUserOption((o) =>
            o
                .setName("player1")
                .setDescription("Player 1 (Leader)")
                .setDescriptionLocalizations({
                    vi: "Người chơi 1 (Đội trưởng)",
                })
                .setRequired(true),
        )
        .addStringOption((o) =>
            o
                .setName("player1_ingame")
                .setDescription("Player 1's Ingame (Leader)")
                .setDescriptionLocalizations({
                    vi: "Tên game của người chơi 1 (Đội trưởng)",
                })
                .setRequired(true),
        )
        .addUserOption(
            (o) =>
                o
                    .setName("player2")
                    .setDescription("Player 2")
                    .setDescriptionLocalizations({
                        vi: "Người chơi 1",
                    }),
            // .setRequired(true),
        )
        .addStringOption(
            (o) =>
                o
                    .setName("player2_ingame")
                    .setDescription("Player 2's Ingame")
                    .setDescriptionLocalizations({
                        vi: "Tên game của người chơi 2",
                    }),
            // .setRequired(true),
        ),
    // .addUserOption((o) =>
    //     o
    //         .setName("player3")
    //         .setDescription("Player 3")
    //         .setDescriptionLocalizations({
    //             vi: "Người chơi 3",
    //         })
    //         .setRequired(true),
    // )
    // .addStringOption((o) =>
    //     o
    //         .setName("player3_ingame")
    //         .setDescription("Player 3's Ingame")
    //         .setDescriptionLocalizations({
    //             vi: "Tên game của người chơi 3",
    //         })
    //         .setRequired(true),
    // )
    // .addUserOption((o) =>
    //     o
    //         .setName("player4")
    //         .setDescription("Player 4")
    //         .setDescriptionLocalizations({
    //             vi: "Người chơi 4",
    //         })
    //         .setRequired(true),
    // )
    // .addStringOption((o) =>
    //     o
    //         .setName("player4_ingame")
    //         .setDescription("Player 4's Ingame")
    //         .setDescriptionLocalizations({
    //             vi: "Tên game của người chơi 4",
    //         })
    //         .setRequired(true),
    // )
    // .addUserOption((o) =>
    //     o
    //         .setName("player5")
    //         .setDescription("Player 5")
    //         .setDescriptionLocalizations({
    //             vi: "Người chơi 5",
    //         })
    //         .setRequired(true),
    // )
    // .addStringOption((o) =>
    //     o
    //         .setName("player5_ingame")
    //         .setDescription("Player 5's Ingame")
    //         .setDescriptionLocalizations({
    //             vi: "Tên game của người chơi 5",
    //         })
    //         .setRequired(true),
    // )
    // .addUserOption((o) =>
    //     o
    //         .setName("player6")
    //         .setDescription("Player 6")
    //         .setDescriptionLocalizations({
    //             vi: "Người chơi 6",
    //         })
    //         .setRequired(false),
    // )
    // .addStringOption((o) =>
    //     o
    //         .setName("player6_ingame")
    //         .setDescription("Player 6's Ingame")
    //         .setDescriptionLocalizations({
    //             vi: "Tên game của người chơi 6",
    //         })
    //         .setRequired(false),
    // )
    // .addStringOption((o) =>
    //     o
    //         .setName("tag")
    //         .setDescription("Team tag (Eg: T1, GAM)")
    //         .setDescriptionLocalizations({
    //             vi: "Tên viết tắt của đội (VD: T1, GAM)",
    //         })
    //         .setMaxLength(5)
    //         .setRequired(false),
    // ),
    {
        global: true,
        ownerOnly: true,
    },
    async (client, interaction) => {
        await interaction.deferReply();
        const { guildId } = interaction;

        const name = interaction.options.getString("name", true);
        // const tag = interaction.options.getString("tag");

        // eslint-disable-next-line prefer-const
        let playersToCreate = [];
        const maxPlayer =
            interaction.options.data[0].options!.filter((o) =>
                o.name.startsWith("player"),
            ).length / 2;

        for (let i = 1; i <= maxPlayer; i++) {
            const user = interaction.options.getUser(`player${i}`);
            const ign = interaction.options.getString(`player${i}_ingame`);

            if (user && ign)
                playersToCreate.push({
                    discordId: user.id,
                    ign,
                });
        }

        const tournament = await client.db.orm.public.Tournament.first({
            guildId,
            status: "ACTIVE",
        });

        if (!tournament)
            throw new Error(
                "Chưa có giải đấu nào đang diễn ra trong máy chủ này!",
            );

        try {
            await client.db.orm.public.Team.create({
                name,
                // tag,
                tournamentId: tournament.id,
                players: (p) => p.create(playersToCreate),
            });

            await interaction.editReply(
                `✅ Tạo thành công đội thi đấu **${name}** thuộc giải thi đấu **${tournament.name}** với **${playersToCreate.length}** thành viên`,
            );
        } catch (error) {
            if (
                error instanceof Error &&
                "sqlState" in error &&
                error.sqlState === "23505"
            ) {
                throw Error("Đội thi đã tồn tại trong giải đấu");
            }

            throw error;
        }
    },
);
