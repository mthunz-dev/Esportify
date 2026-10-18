import errors from "@/data/errors";

type ErrorCode = keyof typeof errors;

export default class ExpenseTrackerError extends Error {
    code: string | ErrorCode;

    constructor(code: string | ErrorCode) {
        const message = errors[code as ErrorCode] || "Unkown Error";
        super(message);

        this.code = code;
    }
}
