declare namespace NodeJS {
    interface ProcessEnv {
        readonly DATABASE_URL: string;
        readonly DISCORD_BOT_TOKEN: string;
        readonly DISCORD_BOT_CLIENT_ID: string;
        readonly DISCORD_BOT_PREFIX: string;
        readonly DISCORD_GUILD_ID: string;
    }
}
