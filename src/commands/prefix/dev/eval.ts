import { ResponseHelper } from "@/helpers/response";
import { prefix } from "@/layouts/command";
import { EmbedBuilder } from "discord.js";
import { inspect } from "node:util";
import { Category } from "@/types/enum";
import ms from "ms";

export default prefix(
    "eval",
    {
        description: "Thực thi lệnh trong CMD",
        developersOnly: true,
        category: Category.dev,
        hidden: true,
    },
    async (client, message, args) => {
        const embed = new EmbedBuilder();
        const _ = await import("lodash");

        if (args.length === 0)
            return await ResponseHelper.sendError("Please type code to run.", {
                replyTo: message,
            });

        const start = Date.now();

        embed
            .setFooter({
                text: `Debugging for ${client.user.username}`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

        const code = args.join(" ");
        const speed = Date.now() - start;

        try {
            const executed = await eval(code);
            embed
                .setAuthor({
                    name: "Run successfully!",
                    iconURL: client.user.displayAvatarURL(),
                })
                .setColor("Green")
                .addFields(
                    {
                        name: `・Type`,
                        value: `\`\`\`prolog\n${typeof executed}\`\`\``,
                    },
                    {
                        name: `・Speed`,
                        value: `\`\`\`ytml\n${speed}ms\`\`\``,
                    },
                    {
                        name: `・Code`,
                        value: `\`\`\`js\n${code}\`\`\``,
                    },
                    {
                        name: `・Output`,
                        value: `\`\`\`js\n${inspect(executed, { depth: 0 })}\`\`\``,
                    },
                );
        } catch (error: any) {
            embed
                .setAuthor({
                    name: "Run failure!",
                    iconURL: client.user.displayAvatarURL(),
                })
                .setColor("Red")
                .addFields({
                    name: `・Code`,
                    value: `\`\`\`js\n${code}\`\`\``,
                });

            if (error.message.length < 900) {
                embed.addFields({
                    name: `・Error`,
                    value: `\`\`\`js\n${error.name}: ${error.message}\`\`\``,
                });
            }
            console.error(error);
        }

        await ResponseHelper.send(embed, {
            deleteAfter: ms("1m"),
            channel: message.channel,
        });
    },
);
