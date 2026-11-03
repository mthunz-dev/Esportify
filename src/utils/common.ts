export const isSquare = (n: number) => {
    const sqrt = Math.floor(Math.sqrt(n));

    return sqrt * sqrt === n;
};

export const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

export const sleep = async (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};
