// import config from "@/config";
import { isEmptyObject, isValidFile } from "@/helpers/validator";
import logger from "@/helpers/logger";
import { readdirSync, existsSync } from "fs";
import prefixl from "@/layouts/prefix";
import subpf from "@/layouts/subpf";
import slashl from "@/layouts/slash";
import subsl from "@/layouts/subsl";
import path from "path";

export default async (client: ExtendedClient) => {
    const { commands } = client.collection;
    const { prefix, slash } = commands;
    const commamdDir = path.resolve(__dirname, "../commands").replace(/\\/g, "/");

    for (const type of readdirSync(commamdDir)) {
        const typeDir = `${commamdDir}/${type}`;
        for (const category of readdirSync(typeDir)) {
            const categoryDir = `${typeDir}/${category}`;
            for (const file of readdirSync(categoryDir).filter((f) =>
                isValidFile(f, ["ts", "js"]),
            )) {
                const module = (await import(`${categoryDir}/${file}`)).default as
                    | ReturnType<typeof prefixl>
                    | ReturnType<typeof slashl>;

                if (!module || isEmptyObject(module)) continue;
                // logger(`Module not found at ${file}`, "warn");

                if (module.options.ignore) {
                    logger(`Ignore command at ${file}`, "ignore");
                    continue;
                }

                if ("name" in module) {
                    // prefix.set(module.name, {
                    //     ...module,
                    //     options: {
                    //         ...module.options,
                    //         usage: `${config.handler.prefix} ${module.name}${module.options.usage || ""}`,
                    //         samples: module.options.samples
                    //             ? module.options.samples.map(
                    //                   (sample: string) =>
                    //                       `${config.handler.prefix} ${module.name}${sample.length || ""}`,
                    //               )
                    //             : [`${config.handler.prefix} ${module.name}`],
                    //     },
                    // });
                    prefix.set(module.name, module);

                    module.options.aliases?.forEach((alias: string) => {
                        if (alias) {
                            if (commands.aliases.has(alias))
                                return logger(
                                    `Duplicate alias ${alias} at command ${module.name}!`,
                                    "err",
                                );
                            commands.aliases.set(alias, module.name);
                        }
                    });

                    if (module.options.sub) {
                        const subCommandDir = `${categoryDir}/${module.name}`;
                        if (existsSync(subCommandDir)) {
                            const { subs, aliases } = module;

                            for (const subfile of readdirSync(subCommandDir).filter((f: string) =>
                                isValidFile(f, ["ts", "js"]),
                            )) {
                                const submodule = (await import(`${subCommandDir}/${subfile}`))
                                    .default as ReturnType<typeof subpf>;
                                if (!submodule || isEmptyObject(submodule)) continue;

                                if (module.options.ignore) {
                                    logger(`Ignore command at ${module.name}/${subfile}`, "ignore");
                                    continue;
                                }

                                submodule.options.fullName ??= `${module.name} ${submodule.name}`;

                                subs.set(submodule.name, submodule);

                                submodule.options.aliases?.forEach((alias) => {
                                    if (aliases.has(alias))
                                        return logger(
                                            `Duplicate alias ${alias} at command ${module.name}/${subfile} !`,
                                            "err",
                                        );
                                    aliases.set(alias, submodule.name);
                                });
                            }
                        }
                    }
                } else {
                    slash.set(module.structure.name, module);

                    if (module.options.sub && "addSubcommand" in module.structure) {
                        const subCommandDir = `${categoryDir}/${module.structure.name}`;

                        if (existsSync(subCommandDir)) {
                            const { subs } = module;

                            for (const subfile of readdirSync(subCommandDir).filter((f: string) =>
                                isValidFile(f, ["ts", "js"]),
                            )) {
                                const submodule = (await import(`${subCommandDir}/${subfile}`))
                                    .default as ReturnType<typeof subsl>;
                                if (!submodule || isEmptyObject(submodule)) continue;

                                if (module.options.ignore) {
                                    logger(
                                        `Ignore command at ${module.structure.name}/${subfile}`,
                                        "ignore",
                                    );
                                    continue;
                                }

                                module.structure.addSubcommand(submodule.structure);
                                subs.set(submodule.structure.name, submodule);
                            }
                        }
                    }

                    if (module.options.global) {
                        client.publicApplicationcommandsArray.push(module.structure);
                    } else {
                        client.privateApplicationcommandsArray.push(module.structure);
                    }
                }
            }
        }
    }

    if (prefix.size) logger(`Initialized ${prefix.size} prefix commands`, "done");
    if (slash.size) logger(`Initialized ${slash.size} slash commands`, "done");
};
