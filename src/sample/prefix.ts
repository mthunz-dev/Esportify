import { prefix } from "@/layouts/command";
import { Category } from "@/types/enum";

export default prefix(
    "",
    {
        description: "",
        aliases: [""],
        cooldown: "5s",
        category: Category.mics,
    },
    async (client, message, args) => {},
);
