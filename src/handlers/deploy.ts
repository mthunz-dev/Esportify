import logger from "@/utils/logger";
import { isSnowflake } from "@/helpers/validator";
import { Routes, type Client } from "discord.js";

export default async (client: ExtendedClient & Client<true>) => {
    try {
        const guildId = Bun.env.GUILD_ID;

        if (guildId && isSnowflake(guildId)) {
            await client.rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                {
                    body: client.privateApplicationcommandsArray,
                },
            );

            logger(
                `Successfully loaded application commands to server ${guildId}.`,
                "done",
            );
        }

        await client.rest.put(Routes.applicationCommands(client.user.id), {
            body: client.publicApplicationcommandsArray,
        });

        logger(
            "Successfully loaded application commands globally to Discord API.",
            "done",
        );
    } catch (error) {
        console.error(error);
        logger(`Unable to load application commands to Discord API`, "err");
    }
};
