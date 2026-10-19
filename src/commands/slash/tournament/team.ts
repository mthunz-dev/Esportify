import slash from "@/layouts/slash";
import { SlashCommandBuilder } from "discord.js";

export default slash(
    new SlashCommandBuilder()
        .setName("team")
        .setContexts(0)
        .setDescription("Manage tournament team")
        .setDescriptionLocalizations({ vi: "Quản lý đội thi đấu" }),
    {
        global: true,
        ownerOnly: true,
        sub: true,
    },
    async (client, interation) => {},
);
