const job = (
    id: string,
    time: string,
    handler: (client: ExtendedClient) => Promise<any>,
) => ({
    id,
    time,
    handler,
});

export default job;
