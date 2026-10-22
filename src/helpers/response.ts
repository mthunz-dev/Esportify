import {
    CommandInteraction,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    EmbedBuilder,
    Message,
    type TextBasedChannel,
    type Interaction,
    ActionRowBuilder,
} from "discord.js";
import { EmbedHelper } from "./embed.ts";
import MessageBuilder, { type MessageOptions } from "./message-builder.ts";
import ms from "ms";
import _ from "lodash";
import { buttonLoading } from "@/data/constant";

type AnyInteraction =
    | CommandInteraction<"cached">
    | MessageComponentInteraction<"cached">
    | ModalSubmitInteraction<"cached">;

export interface ComponentOptions {
    allowedUsers: string[];
    time?: number;
    onCollect?: (
        interaction: MessageComponentInteraction,
    ) => Promise<void> | void;

    additionArgs?: any[];

    onEnd?: (reason: string) => Promise<void> | void;
}

interface SendOptions {
    channel?: TextBasedChannel;
    replyTo?: Message;
    interaction?: AnyInteraction;
    components?: ComponentOptions;
    deleteAfter?: number;
    ephemeral?: boolean;
}

export class ResponseHelper {
    static async disableComponent(message: Message) {
        try {
            message = await message.fetch();

            if (!message.editable) return;

            const disabledRows = message.components.map((row) => {
                const actionRow = ActionRowBuilder.from(row as any);
                actionRow.components.forEach((comp: any) =>
                    comp.setDisabled(true),
                );

                return actionRow;
            });

            const grayEmbeds = message.embeds.map((embed) => {
                return EmbedBuilder.from(embed).setColor("Grey");
            });

            await message.edit({
                embeds: grayEmbeds,
                components: disabledRows as any,
            });
        } catch (error) {
            console.error(
                "[ResponseHelper] Error while disable component",
                error,
            );
        }
    }

    static async send(
        payload: string | MessageBuilder | EmbedBuilder | MessageOptions,
        options: SendOptions,
    ) {
        const {
            channel,
            replyTo,
            interaction,
            deleteAfter,
            ephemeral,
            components,
        } = options;

        if (!channel && !replyTo && !interaction)
            throw new Error("[ResponseHelper] Nothing to send or reply");

        let messageOptions: MessageOptions = {};

        if (payload instanceof MessageBuilder) messageOptions = payload.build();
        else if (payload instanceof EmbedBuilder)
            messageOptions = { embeds: [payload] };
        else if (typeof payload === "string")
            messageOptions = { content: payload };
        else messageOptions = payload;

        if (ephemeral) messageOptions.flags = [64];

        let sentMessage: Message | null = null;

        if (interaction) {
            if (interaction.replied || interaction.deferred) {
                sentMessage = (await interaction.followUp(
                    messageOptions,
                )) as Message;
            } else {
                const response = await interaction.reply({
                    ...messageOptions,
                    withResponse: true,
                });
                sentMessage =
                    response instanceof Message
                        ? response
                        : await interaction.fetchReply();
            }
        } else if (replyTo?.channel.isSendable()) {
            sentMessage = await replyTo.reply(messageOptions);
        } else if (channel?.isSendable()) {
            sentMessage = await channel.send(messageOptions);
        }

        if (!sentMessage)
            throw new Error("[ResponseHelper] Unable to send message");

        if (components) {
            const filter = async (interaction: Interaction) => {
                if (!components.allowedUsers.includes(interaction.user.id)) {
                    if (!(interaction instanceof CommandInteraction)) {
                        await this.defer(interaction as AnyInteraction, true);

                        await this.send(
                            EmbedHelper.error(
                                "Bạn không có quyền dùng tương tác này !",
                            ),
                            { interaction: interaction as AnyInteraction },
                        );
                    }

                    return false;
                } else return true;
            };

            const collector = sentMessage.createMessageComponentCollector({
                filter,
                time: components.time || ms("60m"),
            });

            collector.on("collect", async (interaction) => {
                if (components.onCollect) {
                    await components.onCollect(interaction);
                } else if (interaction.inCachedGuild())
                    await this.handleRoutedComponent(
                        interaction,
                        components.additionArgs,
                    );
            });

            collector.on("end", async (_, reason) => {
                if (components.onEnd) {
                    await components.onEnd(reason);
                }

                await this.disableComponent(sentMessage);
            });
        }

        if (deleteAfter) {
            setTimeout(() => {
                if (sentMessage.deletable) sentMessage.delete().catch(() => {});
            }, deleteAfter);
        }
    }

    private static async handleRoutedComponent(
        interaction: MessageComponentInteraction<"cached">,
        additionArgs: any[] = [],
    ) {
        const client = interaction.client as ExtendedClient;
        const oldMessage = _.cloneDeep(interaction.message);
        const oldComponents = oldMessage.components;

        try {
            if (!interaction.customId.endsWith("manual")) {
                await interaction.update(buttonLoading.build());
            }

            const { components } = client.collection;
            const [componentId] = interaction.customId.split(".");
            let result = false;

            if (interaction.isButton()) {
                const buttonComponent = components.buttons.get(componentId);
                if (buttonComponent) {
                    result = await buttonComponent.handler(
                        client,
                        interaction,
                        oldComponents,
                        ...additionArgs,
                    );
                }
            } else if (interaction.isStringSelectMenu()) {
                const value = interaction.values[0];
                const menuComponent =
                    components.selects.get(value) ||
                    components.selects.get(componentId);
                if (menuComponent) {
                    result = await menuComponent.handler(
                        client,
                        interaction,
                        oldComponents,
                        ...additionArgs,
                    );
                }
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
                await this.sendError(err.message, { interaction });

                if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) {
                    console.error("[Component Router Error]:", err);
                }
            }
        }
    }

    static async sendSuccess(message: string, options: SendOptions) {
        const embed = EmbedHelper.success(message);
        return this.send(embed, options);
    }

    static async sendError(message: string, options: SendOptions) {
        const embed = EmbedHelper.error(message);
        return this.send(embed, options);
    }

    static async defer(
        interaction: AnyInteraction,
        isEphemeral: boolean = false,
    ) {
        if (!interaction.deferred && !interaction.replied) {
            const options = isEphemeral ? { flags: [64] } : {};
            await interaction.deferReply(options);
        }
    }
}
