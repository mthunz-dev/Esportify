import MessageBuilder from "@/helpers/message-builder";
import { ResponseHelper } from "@/helpers/response";
import { slash } from "@/layouts/command";
import { getGameConfig } from "@/modules/games";
import { AttachmentBuilder, hyperlink, SlashCommandBuilder } from "discord.js";
import path from "path";

export default slash(
    new SlashCommandBuilder()
        .setName("register")
        .setDescription("Register your team for the current tournament")
        .setDescriptionLocalizations({
            vi: "Đăng ký đội của bạn tham gia giải đấu hiện tại",
        })
        .setContexts(0),
    {
        global: true,
    },
    async (client, interaction) => {
        const tournament = await client.db.orm.public.Tournament.first({
            guildId: interaction.guildId,
            status: "ACTIVE",
        });

        if (!tournament)
            return ResponseHelper.sendError(
                "Hiện không có giải đấu nào đang mở đăng ý",
                { interaction, ephemeral: true },
            );

        const game = getGameConfig(tournament.game);

        if (!game)
            return ResponseHelper.sendError(
                "Tựa game của giải đấu chưa được công bố, vui lòng đăng ký lại sau.",
                { interaction, ephemeral: true },
            );

        const whereIsUsername = new AttachmentBuilder(
            path.join(__dirname, "../../../../assets/discord_username.png"),
        );

        const message = new MessageBuilder()
            .setAuthor({
                name: "Đăng ký tham gia giải đấu",
                iconURL:
                    "https://cdn-icons-png.flaticon.com/128/10336/10336114.png",
            })
            .setFields(
                {
                    name: `ℹ️ Thông tin giải đấu`,
                    value: [
                        `- **\`Tên giải đấu\`**: ${tournament.name}`,
                        `- **\`Tựa game\`**: ${game.displayName.toUpperCase()}`,
                        `- **\`Thể lệ chi tiết\`**: ${tournament.rulesURL ? hyperlink("__Thể lệ__", tournament.rulesURL) : "Chưa công bố"}`,
                    ].join("\n"),
                },
                {
                    name: `⚠️ Lưu ý`,
                    value: [
                        `- Chuẩn bị Discord username và ingame của các thành viên trong đội trước khi đăng ký`,
                        `- Xem ảnh phía dưới để biết Discord username của bạn`,
                    ].join("\n"),
                },
            )
            .addComponents([
                {
                    type: 2,
                    customId: `register_tournament.${tournament.id}.manual`,
                    style: 1,
                    label: "Đăng ký",
                    disabled: false,
                },
            ])
            .addFiles(whereIsUsername)
            .setColor("Blue")
            .setFooter({
                iconURL: client.user.displayAvatarURL(),
                text: client.user.displayName,
            })
            .setEphemeral(true)
            .setTimestamp()
            .setImage("attachment://discord_username.png");

        await ResponseHelper.send(message, { interaction });

        // const modal = new ModalBuilder()
        //     .setTitle("ĐĂNG KÝ THAM GIA GIẢI ĐẤU")
        //     .setCustomId(`register.${tournament.id}`)
        //     .addTextDisplayComponents((builder) =>
        //         builder.setContent(
        //             [
        //                 `# ${tournament.name}`,
        //                 `- **\`Tựa game\`**: ${game.displayName.toUpperCase()}`,
        //                 `- **\`Thể lệ chi tiết\`**: ${tournament.rulesURL ? hyperlink("Thể lệ", tournament.rulesURL) : "Chưa công bố"}`,
        //             ].join("\n"),
        //         ),
        //     )
        //     .addLabelComponents(
        //         new LabelBuilder()
        //             .setLabel("Tên đội của bạn")
        //             .setTextInputComponent((builder) =>
        //                 builder
        //                     .setCustomId("team_name")
        //                     .setStyle(1)
        //                     .setMaxLength(50)
        //                     .setPlaceholder("(VD: T1, GAM Esports)")
        //                     .setRequired(true),
        //             ),
        //         new LabelBuilder()
        //             .setLabel("Thành viên đội")
        //             // .setDescription(`-# Cách lấy username: `)
        //             .setTextInputComponent((builder) =>
        //                 builder
        //                     .setCustomId("players_list")
        //                     .setStyle(2)
        //                     .setPlaceholder(
        //                         [
        //                             `username_1 | ingame_1 (Đội trưởng)`,
        //                             `username_2 | ingame_2`,
        //                             `username_3 | ingame_3`,
        //                             `...`,
        //                         ].join("\n"),
        //                     )
        //                     .setRequired(true),
        //             ),
        //     );
        // await interaction.showModal(modal);
    },
);
