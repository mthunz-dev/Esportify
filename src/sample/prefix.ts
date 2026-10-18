import prefix from "@/layouts/prefix";
import { Category } from "@/types/enum";

export default prefix(
    "",
    {
        description: "",
        aliases: [""],
        cooldown: "5s",
        category: Category.mics,
    },
    async (client, user, message, args) => {},
);
