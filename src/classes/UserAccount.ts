import type { Models } from "@/prisma/contract";
import type Transaction from "./Transaction";

export default class UserAccount {
    public cid: string;
    public data: Models.public_UserAccount;
    public client: ExtendedClient;

    constructor(data: Models.public_UserAccount, client: ExtendedClient) {
        this.cid = data.cid;
        this.data = data;
        this.client = client;
    }

    public async createTransaction(transaction: Transaction) {
        const { amount, category, time, type } = transaction.data;

        const createdTransaction = await this.client.db.orm.public.Transaction.create({
            accountId: this.cid,
            type,
            amount,
            category,
            time,
        });

        return createdTransaction;
    }

    public async deleteTransaction(transactionId: string) {
        return await this.client.db.orm.public.Transaction.where({ id: transactionId }).delete();
    }

}
