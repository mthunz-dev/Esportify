import MessageBuilder from "@/helpers/message-builder";
import { prefix } from "@/layouts/command";
import { Category } from "@/types/enum";

export default prefix(
    "ping",
    {
        description: "Hiển thị độ trễ của bot",
        aliases: ["pong"],
        cooldown: "5s",
        category: Category.mics,
    },
    async (client, message, args) => {
        const msg = await message.channel.send("> Pinging...");

        const botLatency = msg.createdTimestamp - message.createdTimestamp;
        const apiLatency = client.ws.ping;

        const ping = new MessageBuilder()
            .setDescription(
                [
                    `> **\`Bot\`**: \`${botLatency}ms\``,
                    `> **\`API\`**: \`${apiLatency}ms\``,
                ].join("\n"),
            )
            .setColor(botLatency < 400 ? "Green" : "Red");

        await msg.edit(ping.build());
    },
);
