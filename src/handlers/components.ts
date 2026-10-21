import logger from "@/helpers/logger";
import { isEmptyObject } from "@/helpers/validator";
import { readdirSync } from "fs";

const ComponentsType = ["selects", "buttons"];

export default async (client: ExtendedClient) => {
    for (const type of readdirSync(`./src/components/`)) {
        for (const file of readdirSync(`./src/components/${type}/`).filter(
            (f) => f.endsWith(".js") || f.endsWith(".ts"),
        )) {
            const module = (await import(`../components/${type}/${file}`))
                .default;

            if (!module || isEmptyObject(module)) {
                logger(`Module not found at: ${file}`, "warn");
                continue;
            }

            if (!module.options && module.options.ignore) {
                logger(`Ignore component at: ${file}`, "ignore");
                continue;
            }

            if (!ComponentsType.includes(type)) {
                logger(
                    `Invalid folder name, it must be ${ComponentsType.join("/")}`,
                    "err",
                );
                continue;
            }

            client.collection.components[type as "buttons" | "selects"].set(
                module?.customId || module?.commandName,
                module,
            );
        }
    }
};
