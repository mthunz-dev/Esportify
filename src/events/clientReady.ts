import logger from "@/utils/logger";
import event from "@/layouts/event";

export default event("clientReady", { once: true }, async (_, client) => {
    logger("Logged in as " + client.user.tag, "done");
});
