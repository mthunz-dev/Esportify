import type {
    ActionRow,
    AnySelectMenuInteraction,
    ButtonInteraction,
    MessageActionRowComponent,
    PermissionResolvable,
} from "discord.js";

export interface ComponentOptions {
    ignore?: boolean;
    everyone?: boolean;
    permissions?: PermissionResolvable;
    contributorsOnly?: boolean;
    developersOnly?: boolean;
    ownerOnly?: boolean;
}

export const button = (
    customId: string,
    options: ComponentOptions,
    handler: (
        client: ExtendedClient,
        interaction: ButtonInteraction<"cached">,
        components: ActionRow<MessageActionRowComponent>[],
        ...additionArgs: any
    ) => Promise<any>,
) => ({ customId, options, handler });

export const select = (
    customId: string,
    options: ComponentOptions,
    handler: (
        client: ExtendedClient,
        interaction: AnySelectMenuInteraction<"cached">,
        components: ActionRow<MessageActionRowComponent>[],
        ...additionArgs: any
    ) => Promise<any>,
) => ({ customId, options, handler });
