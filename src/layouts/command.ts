import {
    Collection,
    type Message,
    type ChatInputCommandInteraction,
    type SlashCommandBuilder,
    type SlashCommandOptionsOnlyBuilder,
    type SlashCommandSubcommandsOnlyBuilder,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import type {
    PrefixOptions,
    SubPrefixOptions,
    SlashOptions,
} from "@/types/command";

export const prefix = (
    name: string,
    options: PrefixOptions,
    handler: (
        client: ExtendedClient,
        message: Message<true>,
        args: string[],
    ) => Promise<any>,
) => ({
    name,
    options,
    handler,
    subs: new Collection<string, ReturnType<typeof subpf>>(),
    aliases: new Collection<string, string>(),
});

export const subpf = (
    name: string,
    options: SubPrefixOptions,
    handler: (
        client: ExtendedClient,
        message: Message<true>,
        args: string[],
    ) => Promise<any>,
) => ({
    name,
    options,
    handler,
});

export const slash = (
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

export const subsl = (
    structure: SlashCommandSubcommandBuilder,
    options: SlashOptions,
    handler: (
        client: ExtendedClient,
        interaction: ChatInputCommandInteraction<"cached">,
    ) => Promise<any>,
) => ({
    structure,
    options,
    handler,
});

export default subpf;
