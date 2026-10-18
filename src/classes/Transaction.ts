import type { Models } from "@/prisma/contract";

export default class Transaction {
    public id: string;
    public data: Models.public_Transaction;
    public client: ExtendedClient;

    constructor(data: Models.public_Transaction, client: ExtendedClient) {
        this.id = data.id;
        this.data = data;
        this.client = client;
    }
}
