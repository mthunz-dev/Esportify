import { slash } from "@/layouts/command";
import { SlashCommandBuilder } from "discord.js";

export default slash(
    new SlashCommandBuilder()
        .setName("tournament")
        .setContexts(0)
        .setDescription("Manage Tournament")
        .setDescriptionLocalizations({ vi: "Quản lý giải đấu" }),
    {
        global: true,
        ownerOnly: true,
        sub: true,
    },
    async (client, interaction) => {},
);
