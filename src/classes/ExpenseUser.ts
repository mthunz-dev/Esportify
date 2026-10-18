import type { Models } from "@/prisma/contract";
import { type GuildMember } from "discord.js";
import ExpenseTrackerError from "./ExpenseTrackerError";

export default class ExpenseUser {
    public id: string;
    public data: Models.public_User;
    public client: ExtendedClient;
    public member?: GuildMember;

    constructor(id: string, data: Models.public_User, client: ExtendedClient) {
        this.id = id;
        this.client = client;
        this.data = data;
    }

    public async getBalance(accountId?: string) {
        if (accountId) {
            const accountData = this.data.accounts.find((a) => a.cid == accountId);

            if (!accountData) throw new ExpenseTrackerError("INVALID_ACCOUNT");

            return accountData.balance;
        } else {
            return this.data.accounts.reduce((prev, cur) => prev + cur.balance, 0);
        }
    }


}
