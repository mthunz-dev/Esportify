export const isEmptyObject = (object: NonNullable<unknown>): boolean => {
    return Object.keys(object).length === 0;
};

export const isSnowflake = (id: any): boolean => {
    return /^\d+$/.test(id);
};

export const isNumber = (input: any, options?: IsNumberOptions) => {
    const number = Number(input);
    if (isNaN(number)) return false;

    if (options?.negative && number > 0) return false;

    if (options?.positive && number < 0) return false;

    if (!options?.zero && !number) return false;

    return number;
};

export const isValidURL = (str: string) => {
    const pattern = new RegExp(
        "^(https?:\\/\\/)?" +
            "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
            "((\\d{1,3}\\.){3}\\d{1,3}))" +
            "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
            "(\\?[;&a-z\\d%_.~+=-]*)?" +
            "(\\#[-a-z\\d_]*)?$",
        "i",
    );
    return !!pattern.test(str);
};

export const isValidFile = (fileName: string, extensions: string[]) => {
    return extensions.some((ext) => fileName.endsWith(`.${ext}`));
};
