import { buttonLoading } from "@/data/constant";
import { Guard } from "@/helpers/guard";
import { ResponseHelper } from "@/helpers/response";

import event from "@/layouts/event";
import _ from "lodash";

export default event(
    "interactionCreate",
    { once: false },
    async (client, interaction) => {
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;
        if (!interaction.isButton() && !interaction.isAnySelectMenu()) return;

        const { buttons, selects } = client.collection.components;
        const customId = interaction.customId.split(".")[0];

        try {
            let result = false;
            const oldMessage = _.cloneDeep(interaction.message);
            const oldComponents = oldMessage.components;

            if (interaction.isButton()) {
                const component = buttons.get(customId);

                if (component?.options.everyone) {
                    if (
                        !Guard.checkPermission(
                            interaction.member,
                            component.options,
                        )
                    )
                        throw client.errors.INVALID_INTERACTION;

                    if (!interaction.customId.endsWith("manual"))
                        await interaction.update(buttonLoading.build());

                    result = await component.handler(
                        client,
                        interaction,
                        oldComponents,
                    );
                } else return;
            } else if (interaction.isAnySelectMenu()) {
                const component = selects.get(customId);

                if (component?.options.everyone) {
                    if (
                        !Guard.checkPermission(
                            interaction.member,
                            component.options,
                        )
                    )
                        throw client.errors.INVALID_INTERACTION;

                    if (!interaction.customId.endsWith("manual"))
                        await interaction.update(buttonLoading.build());

                    result = await component.handler(
                        client,
                        interaction,
                        oldComponents,
                    );
                } else return;
            }

            if (!result) {
                await interaction.message.edit({
                    ..._.pick(oldMessage, ["content", "embeds", "components"]),
                });
            }
        } catch (err: any) {
            if (err instanceof Error) {
                ResponseHelper.sendError(err.message, { interaction });
                if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) {
                    console.error("[Command Handle Error]:", err);
                }
            }
        }
    },
);
