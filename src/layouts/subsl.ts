import User from "@/classes/User";
import { type SlashCommandSubcommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { SlashOptions } from "@/types/command";

const subsl = (
    structure: SlashCommandSubcommandBuilder,
    options: SlashOptions,
    handler: (
        client: ExtendedClient,
        user: User,
        interaction: ChatInputCommandInteraction<"cached">,
    ) => Promise<any>,
) => ({
    structure,
    options,
    handler,
});

export default subsl;
