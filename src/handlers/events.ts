import logger from "@/utils/logger";
import { readdirSync } from "fs";
import { type ClientEvents } from "discord.js";
import event from "@/layouts/event";
import { ValidatorUtil } from "@/utils/validator";

export default async (client: ExtendedClient) => {
    const eventNames = client.eventNames() as (keyof ClientEvents)[];
    eventNames.forEach((eventName) => {
        const listeners = client.listeners(eventName) as ((
            ...args: any[]
        ) => void)[];
        listeners.forEach((listener) => {
            if (listener.name === "discordListener")
                client.off(eventName, listener);
        });
    });

    client.setMaxListeners(0);
    let count = 0;

    for (const file of readdirSync("./src/events/").filter((f: string) =>
        ValidatorUtil.isValidFile(f, ["ts", "js"]),
    )) {
        const module = (await import(`../events/${file}`))
            .default as ReturnType<typeof event>;

        if (!module || ValidatorUtil.isEmptyObject(module)) {
            logger(`Module not found at ${file}`, "warn");
            continue;
        }

        if (module.options.ignore) {
            logger(`Ignore event at ${file}`, "ignore");
            continue;
        }

        const discordListener = <T extends keyof ClientEvents>(
            ...args: ClientEvents[T]
        ) => module.handler(client, ...args);

        client[module.options.once ? "once" : "on"](
            module.name,
            discordListener,
        );
        count++;
    }

    if (count) logger(`Initialized ${count} events`, "done");
};
