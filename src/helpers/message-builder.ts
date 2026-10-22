import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    StringSelectMenuBuilder,
    type APIEmbedField,
    type ColorResolvable,
    type EmbedAuthorOptions,
    type EmbedFooterOptions,
    type InteractionButtonComponentData,
    type LinkButtonComponentData,
    type MessageMentionOptions,
    type StringSelectMenuComponentData,
} from "discord.js";

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

export interface File {
    attachment: Buffer;
    name: string;
}

export type ComponentData =
    | DeepWriteable<StringSelectMenuComponentData>
    | InteractionButtonComponentData
    | LinkButtonComponentData;

export interface MessageOptions {
    content?: string;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
    allowedMentions?: MessageMentionOptions;
    files?: File[];
    flags?: any;
}

export default class MessageBuilder {
    private index: number;
    private options: MessageOptions;

    constructor() {
        this.index = -1;
        this.options = {
            content: undefined,
            allowedMentions: { repliedUser: false, parse: ["users"] },
        };
    }

    public get currentEmbed() {
        return this.options.embeds?.[this.index];
    }

    public setIndex(index: number) {
        this.index = index;
        return this;
    }

    public setContent(content: string | undefined) {
        this.options.content ??= content;
        return this;
    }

    public addEmbeds(amount = 1) {
        this.options.embeds ??= [];

        this.options.embeds.push(...Array(amount).fill(new EmbedBuilder()));
        this.index++;
        return this;
    }

    public setAuthor(author: EmbedAuthorOptions | null) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setAuthor(author);
        return this;
    }

    public setColor(color: ColorResolvable | `#${string}`) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setColor(color);
        return this;
    }

    public setFooter(footer: EmbedFooterOptions | null) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setFooter(footer);
        return this;
    }

    public setFields(...fields: APIEmbedField[]) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setFields(...fields);
        return this;
    }

    public addFields(...fields: APIEmbedField[]) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.addFields(...fields);
        return this;
    }

    public setImage(url: string | null) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setImage(url);
        return this;
    }

    public setThumbnail(url: string | null) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setThumbnail(url);
        return this;
    }

    public setTitle(title: string | null) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setTitle(title);
        return this;
    }

    public setURL(url: string | null) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setURL(url);
        return this;
    }

    public setTimestamp(timestamp: Date | number | null = new Date()) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setTimestamp(timestamp);
        return this;
    }

    public setDescription(description: string | null) {
        if (!this.options.embeds?.length) this.addEmbeds();

        this.currentEmbed?.setDescription(description);
        return this;
    }

    public addComponents(...components: ComponentData[][]) {
        this.options.components ??= [];

        for (const component of components) {
            const row = new ActionRowBuilder<
                ButtonBuilder | StringSelectMenuBuilder
            >();
            for (const cp of component) {
                let cpBuilder;

                switch (cp.type) {
                    case ComponentType.Button:
                        cpBuilder = new ButtonBuilder().setStyle(cp.style);

                        if (cp.label) cpBuilder.setLabel(cp.label);
                        if (cp.emoji) cpBuilder.setEmoji(cp.emoji);

                        if (cp.style === ButtonStyle.Link)
                            cpBuilder.setURL(cp.url);
                        else cpBuilder.setCustomId(cp.customId);

                        break;
                    case ComponentType.StringSelect:
                        cpBuilder = new StringSelectMenuBuilder()
                            .setCustomId(cp.customId)
                            .setOptions(cp.options);
                        if (cp.placeholder)
                            cpBuilder.setPlaceholder(cp.placeholder);
                        break;
                }

                cpBuilder.setDisabled(!!cp.disabled);

                row.addComponents(cpBuilder);
            }

            this.options.components?.push(row);
        }

        return this;
    }

    public setComponents(...components: ComponentData[][]) {
        this.options.components = [];

        for (const component of components) {
            const row = new ActionRowBuilder<
                ButtonBuilder | StringSelectMenuBuilder
            >();
            for (const cp of component) {
                let cpBuilder;

                switch (cp.type) {
                    case ComponentType.Button:
                        cpBuilder = new ButtonBuilder()
                            .setDisabled(!!cp.disabled)
                            .setStyle(cp.style);

                        if (cp.label) cpBuilder.setLabel(cp.label);
                        if (cp.emoji) cpBuilder.setEmoji(cp.emoji);

                        if (cp.style === ButtonStyle.Link)
                            cpBuilder.setURL(cp.url);
                        else cpBuilder.setCustomId(cp.customId);

                        break;
                    case ComponentType.StringSelect:
                        cpBuilder = new StringSelectMenuBuilder()
                            .setCustomId(cp.customId)
                            .setOptions(cp.options)
                            .setDisabled(!!cp.disabled);
                        if (cp.placeholder)
                            cpBuilder.setPlaceholder(cp.placeholder);
                        break;
                }

                row.addComponents(cpBuilder);
            }

            this.options.components?.push(row);
        }
        return this;
    }

    public addFiles(...files: File[]) {
        this.options.files = [];
        this.options.files.push(...files);

        return this;
    }

    public setFiles(...files: File[]) {
        this.options.files = files;
        return this;
    }

    public setMentions(options: MessageMentionOptions) {
        this.options.allowedMentions = options;
        return this;
    }

    public setHiden(hide: boolean) {
        if (hide) this.options.flags = ["Ephemeral"];
        else this.options.flags = undefined;

        return this;
    }

    public build() {
        return this.options;
    }

    public toJSON() {
        return { ...this.options };
    }
}
