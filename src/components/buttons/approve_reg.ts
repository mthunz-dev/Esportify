import { button } from "@/layouts/component";
import { EmbedBuilder, PermissionsBitField } from "discord.js";

export default button(
    "approve_reg",
    {
        everyone: true,
        permissions: [PermissionsBitField.Flags.Administrator],
    },
    async (client, interaction) => {
        const parts = interaction.customId.split(".");
        const teamId = parts[1];
        // const captainId = parts[2];

        try {
            await client.db.orm.public.Team.where({ id: teamId }).update({
                status: "APPROVED",
            });

            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor("Green")
                .addFields({
                    name: "Người duyệt",
                    value: `<@${interaction.user.id}>`,
                });

            await interaction.editReply({
                embeds: [updatedEmbed],
                components: [],
            });
        } catch (error) {
            console.error("Lỗi khi duyệt team:", error);
            // Thông báo lỗi dạng ephemeral cho Admin nếu DB sập
            await interaction.followUp({
                content:
                    "❌ Có lỗi hệ thống xảy ra khi duyệt đội. Vui lòng thử lại sau.",
                ephemeral: true,
            });
        }
    },
);
