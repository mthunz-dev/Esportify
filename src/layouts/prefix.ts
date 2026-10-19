import { Collection, type Message } from "discord.js";
import type { PrefixOptions } from "@/types/command";
import type subpf from "./subpf";

const prefix = (
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

export default prefix;
