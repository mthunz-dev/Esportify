import {
    Collection,
    type ChatInputCommandInteraction,
    type SlashCommandBuilder,
    type SlashCommandOptionsOnlyBuilder,
    type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { SlashOptions } from "@/types/command";
import type subsl from "./subsl";

const slash = (
    structure:
        | SlashCommandBuilder
        | SlashCommandOptionsOnlyBuilder
        | SlashCommandSubcommandsOnlyBuilder,
    options: SlashOptions,
    handler: (
        client: ExtendedClient,
        interaction: ChatInputCommandInteraction<"cached">,
    ) => Promise<any>,
) => ({
    structure,
    options,
    handler,
    subs: new Collection<string, ReturnType<typeof subsl>>(),
});

export default slash;
