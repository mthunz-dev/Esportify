import logger from "@/utils/logger";
import { isEmptyObject } from "@/helpers/validator";
import { readdirSync } from "fs";

const interactionTypes = ["modals"];

export default async (client: ExtendedClient) => {
    for (const type of readdirSync(`./src/interactions/`)) {
        for (const file of readdirSync(`./src/interactions/${type}/`).filter(
            (f) => f.endsWith(".js") || f.endsWith(".ts"),
        )) {
            const module = (await import(`../interactions/${type}/${file}`))
                .default;

            if (!module || isEmptyObject(module)) {
                logger(`Module not found at: ${file}`, "warn");
                continue;
            }

            if (!module.options && module.options.ignore) {
                logger(`Ignore component at: ${file}`, "ignore");
                continue;
            }

            if (!interactionTypes.includes(type)) {
                logger(
                    `Invalid folder name, it must be ${interactionTypes.join("/")}`,
                    "err",
                );
                continue;
            }

            client.collection.interactions[type as "modals"].set(
                module?.customId || module?.commandName,
                module,
            );
        }
    }
};
