import { type MessageOptions } from "@/helpers/MessageBuilder";
import { EmbedBuilder, Message, type GuildBasedChannel, type Interaction } from "discord.js";
import { disableComponents } from "./utils";
import type User from "@/classes/User";
import config from "@/config";
import _ from "lodash";
import { buttonLoading } from "@/data/constant";

export const error = async (err: string, meta: Message<boolean> | Interaction<"cached">) => {
    const message = {
        embeds: [
            new EmbedBuilder().setColor("Red").setDescription(`${config.emojis.cross} ${err}`),
        ],
    };

    if (meta.inGuild()) {
        let msg: Message<true>;

        if (meta instanceof Message) {
            try {
                msg = await meta.reply(message);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                msg = await meta.channel.send(message);
            }

            if (msg)
                setTimeout(async () => {
                    await msg.delete().catch(() => {});
                }, 30000);
        } else if (meta.isRepliable()) {
            try {
                await meta.followUp({ ...message, flags: ["Ephemeral"] });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                await meta.reply(message);
            }
        }
    }
    return false;
};

export interface ComponentOptions {
    allowedIds?: string[];
    time?: number;
}

export interface sentOptions {
    deleteAfter?: number;
}

export interface targetOptions {
    message?: Message<true>;
    channel?: GuildBasedChannel;
    interaction?: Interaction<"cached">;
}

export const sendMessage =
    (client: ExtendedClient) =>
    async (
        user: User | null,
        options: {
            message: MessageOptions;
            target: targetOptions;
            sent?: sentOptions;
            component?: ComponentOptions;
        },
        ...additionArgs: any
    ) => {
        const { message, channel, interaction } = options.target;

        let sentMessage: Message<true> | null = null;

        if (message) sentMessage = await message.reply({ ...options.message });
        else if (channel?.isSendable()) sentMessage = await channel.send(options.message);
        else if (interaction?.isRepliable())
            sentMessage = await interaction.editReply(options.message);

        if (!sentMessage) return;

        if (options.sent) {
            const { deleteAfter } = options.sent;

            if (deleteAfter)
                setTimeout(() => {
                    sentMessage.delete().catch(() => {});
                }, deleteAfter);
        }

        if (options.component && user) {
            const { allowedIds, time } = options.component;

            const filter = async (interaction: Interaction<"cached">) => {
                if (!allowedIds?.includes(interaction.user.id)) {
                    if ("update" in interaction) {
                        await interaction.deferUpdate();
                        return error("Bạn ko có quyền sử dụng tương tác này !", interaction);
                    } else return false;
                } else return true;
            };

            const collector = sentMessage.createMessageComponentCollector({
                filter,
                time,
            });

            collector.on("end", async () => {
                await disableComponents(sentMessage);
            });

            collector.on("collect", async (interaction) => {
                const oldMessage = _.cloneDeep(interaction.message);

                try {
                    if (!interaction.customId.endsWith("manual"))
                        await interaction.update(buttonLoading.options);

                    const { components } = client.collection;
                    const [componentId] = interaction.customId.split(".");
                    const oldComponents = oldMessage.components;

                    let result = false;

                    if (interaction.isButton()) {
                        const buttonComponent = components.buttons.get(componentId);

                        if (buttonComponent)
                            result = await buttonComponent.handler(
                                client,
                                user,
                                interaction,
                                oldComponents,
                                ...additionArgs,
                            );
                    } else if (interaction.isStringSelectMenu()) {
                        const value = interaction.values[0];
                        const menuComponent =
                            components.selects.get(value) || components.selects.get(componentId);

                        if (menuComponent)
                            result = await menuComponent.handler(
                                client,
                                user,
                                interaction,
                                oldComponents,
                                ...additionArgs,
                            );
                    }

                    if (!result) {
                        await interaction.message.edit({
                            ..._.pick(oldMessage, ["content", "embeds", "components"]),
                        });
                    }
                } catch (err: any) {
                    await interaction.message.edit({
                        ..._.pick(oldMessage, ["content", "embeds", "components"]),
                    });

                    if (err instanceof Error) {
                        error(err.message, interaction);
                        if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) console.error(err);
                    }
                }
            });
        }

        return sentMessage;
    };
