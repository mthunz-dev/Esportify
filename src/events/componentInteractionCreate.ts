import ExpenseUser from "@/classes/ExpenseUser";
import { buttonLoading } from "@/data/constant";
import { error } from "@/helpers/response";
import { checkPermission } from "@/helpers/utils";
import event from "@/layouts/event";
import _ from "lodash";

export default event("interactionCreate", { once: false }, async (client, interaction) => {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.channel) return;
    if (!interaction.isButton() && !interaction.isAnySelectMenu()) return;

    const { buttons, selects } = client.collection.components;
    const { id } = interaction.user;
    const customId = interaction.customId.split(".")[0];

    try {
        let result = false;
        const oldMessage = _.cloneDeep(interaction.message);
        const oldComponents = oldMessage.components;

        const data = await client.db.orm.public.User.upsert({
            create: { id },
            update: {},
            conflictOn: { id },
        });

        const user = new ExpenseUser(id, data, client);

        if (interaction.isButton()) {
            const component = buttons.get(customId);

            if (component?.options.everyone) {
                if (!checkPermission(interaction.member, component.options))
                    throw client.errors.INVALID_INTERACTION;

                if (!interaction.customId.endsWith("manual"))
                    await interaction.update(buttonLoading.options);

                result = await component.handler(client, user, interaction, oldComponents);
            } else return;
        } else if (interaction.isAnySelectMenu()) {
            const component = selects.get(customId);

            if (component?.options.everyone) {
                if (!checkPermission(interaction.member, component.options))
                    throw client.errors.INVALID_INTERACTION;

                if (!interaction.customId.endsWith("manual"))
                    await interaction.update(buttonLoading.options);

                result = await component.handler(client, user, interaction, oldComponents);
            } else return;
        }

        if (!result) {
            await interaction.message.edit({
                ..._.pick(oldMessage, ["content", "embeds", "components"]),
            });
        }
    } catch (err: any) {
        if (err instanceof Error) {
            error(err.message, interaction);
            if (!/[À-Ỹà-ỹĂ-Ỵă-ỵĐđ]/.test(err.message)) console.error(err);
        }
    }
});
