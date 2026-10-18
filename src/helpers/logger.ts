import chalk from "chalk";

const logger = (string: string, style: "info" | "err" | "warn" | "done" | "ignore") => {
    string = string
        .replaceAll(/([0-9])+/g, chalk.hex("9900ff")("$&"))
        .replaceAll(/[\w,-]+\.(json|ts|js)/g, chalk.hex("e6d519")("$&"));

    const styles = {
        info: { prefix: chalk.blue("[INFO]"), logFunction: console.log },
        err: { prefix: chalk.red("[ERROR]"), logFunction: console.error },
        warn: { prefix: chalk.yellow("[WARNING]"), logFunction: console.warn },
        done: { prefix: chalk.green("[SUCCESS]"), logFunction: console.log },
        ignore: { prefix: chalk.rgb(255, 140, 0)("[IGNORE]"), logFunction: console.log },
    };

    const selectedStyle = styles[style] || { logFunction: console.log };
    selectedStyle.logFunction(`${selectedStyle.prefix || ""} ${string}`);
};

export default logger;
