import MessageBuilder from "@/helpers/MessageBuilder";
import { emojis } from "./emojis";

export const buttonLoading = new MessageBuilder().setComponents([
    {
        type: 2,
        customId: "buttonLoading",
        emoji: emojis.button_loading,
        style: 2,
        disabled: true,
    },
]);
