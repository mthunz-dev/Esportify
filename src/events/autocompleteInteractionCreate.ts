import event from "@/layouts/event";
import { Events } from "discord.js";

export default event(
    Events.InteractionCreate,
    {
        once: false,
    },
    async (client, interaction) => {
        if (!interaction.inCachedGuild()) return;

        const { modals, autocompletes } = client.collection.interactions;

        if (interaction.isModalSubmit()) {
        }
    },
);
