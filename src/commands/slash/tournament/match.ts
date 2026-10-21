import { slash } from "@/layouts/command";
import { SlashCommandBuilder } from "discord.js";

export default slash(
    new SlashCommandBuilder()
        .setName("match")
        .setContexts(0)
        .setDescription("Manage Tournament's Match")
        .setDescriptionLocalizations({ vi: "Quản lý trận đấu của giải đấu" }),
    {
        global: true,
        ownerOnly: true,
        sub: true,
    },
    async (client, interaction) => {},
);
