import { subsl } from "@/layouts/command";
import { SlashCommandSubcommandBuilder } from "discord.js";

export default subsl(
    new SlashCommandSubcommandBuilder()
        .setName("delete")
        .setDescription("Delete exsiting team")
        .setDescriptionLocalizations({ vi: "Xoá đội chơi đã đăng ký" })
        .addStringOption((o) =>
            o
                .setName("name")
                .setDescription("Team name to delete")
                .setDescriptionLocalizations({ vi: "Tên đội chơi muốn xoá" })
                .setMaxLength(50)
                .setAutocomplete(true)
                .setRequired(true),
        ),
    {
        global: true,
    },
    async (client, interaction) => {
        
    },
);
