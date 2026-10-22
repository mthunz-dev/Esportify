import { db } from "@/prisma/db";
import config from "@/config";
import commands from "@/handlers/commands";
import components from "@/handlers/components";
import schedule from "@/handlers/schedule";
import events from "@/handlers/events";
import type { prefix, slash } from "@/layouts/command";
// import type modal from "@/layouts/modal";
import type { button, select } from "@/layouts/component";
import errors from "@/data/errors";

import {
    Client,
    Collection,
    Guild,
    Partials,
    SlashCommandBuilder,
    type SlashCommandOptionsOnlyBuilder,
    type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import deploy from "@/handlers/deploy";
import logger from "@/utils/logger";

if (config.handler.preconnect)
    (async () => {
        await db.connect();
        logger("Database connected", "done");
    })();

export default class ExtendedClient extends Client<true> {
    public db = db;
    public home!: Guild;
    public config = config;
    public reseting = false;
    public errors = errors;

    public collection = {
        commands: {
            prefix: new Collection<string, ReturnType<typeof prefix>>(),
            slash: new Collection<string, ReturnType<typeof slash>>(),
            aliases: new Collection<string, string>(),
        },

        components: {
            buttons: new Collection<string, ReturnType<typeof button>>(),
            selects: new Collection<string, ReturnType<typeof select>>(),
            // modals: new Collection<string, ReturnType<typeof modal>>(),
        },
    };

    public publicApplicationcommandsArray: (
        | SlashCommandBuilder
        | SlashCommandOptionsOnlyBuilder
        | SlashCommandSubcommandsOnlyBuilder
    )[] = [];

    public privateApplicationcommandsArray: (
        | SlashCommandBuilder
        | SlashCommandOptionsOnlyBuilder
        | SlashCommandSubcommandsOnlyBuilder
    )[] = [];

    constructor() {
        super({
            intents: 3276799,
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.Message,
                Partials.Reaction,
                Partials.User,
                Partials.ThreadMember,
            ],
        });
    }

    public start = async () => {
        commands(this);
        events(this);
        components(this);
        await this.login(Bun.env.DISCORD_BOT_TOKEN);

        deploy(this);
        schedule(this);
    };
}

type CustomClient = ExtendedClient;
declare global {
    interface ExtendedClient extends CustomClient {}
}
