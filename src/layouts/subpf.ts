import type { Message } from "discord.js";
import type { SubPrefixOptions } from "@/types/command";

const subpf = (
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

export default subpf;
