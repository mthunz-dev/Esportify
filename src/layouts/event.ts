import type { ClientEvents } from "discord.js";

export interface EventOptions {
    once: boolean;
    ignore?: boolean;
}

const event = <T extends keyof ClientEvents>(
    name: T | string,
    options: EventOptions,
    handler: (client: ExtendedClient, ...args: ClientEvents[T]) => any,
) => ({
    name,
    options,
    handler,
});

export default event;
