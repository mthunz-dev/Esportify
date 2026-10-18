import { emojis } from "./data/emojis";

const config = {
    handler: {
        prefix: process.env.DISCORD_BOT_PREFIX,
        deploy: true,
        preconnect: true,
        deleteError: "3s",
        deleteComponent: "60s",
        suggestCommand: true,
        commands: {
            prefix: true,
            slash: true,
            user: true,
            message: true,
        },
    },
    users: {
        developers: ["749125766402277377"] as string[],
        ownerId: "",
        contributors: [] as string[],
    },
    emojis: emojis,
};

export default config;
