import ExtendedClient from "@/core/ExtendedClient";
import job from "@/layouts/job";
import { readdirSync } from "fs";
import scheduler from "node-schedule";
import path from "path";

export default async (client: ExtendedClient) => {
    const jobDir = path.resolve(__dirname, "../jobs").replace(/\\/g, "/");

    for (const file of readdirSync(jobDir)) {
        const module = (await import(`${jobDir}/${file}`)).default as ReturnType<typeof job>;

        const existedJob = scheduler.scheduledJobs[module.id];
        if (existedJob) existedJob.cancel();

        scheduler.scheduleJob(module.id, module.time, () => {
            module.handler(client);
        });
    }
};
