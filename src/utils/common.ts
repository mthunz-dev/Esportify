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

export function parseDurationToSeconds(
    duration: string | null | undefined,
): number {
    if (!duration) return 0;

    return duration
        .split(":")
        .reverse() // Đảo ngược để index 0 luôn là giây, 1 luôn là phút...
        .reduce((total, current, index) => {
            // Math.pow(60, index) sẽ tính đúng: 60^0 = 1 (giây), 60^1 = 60 (phút), 60^2 = 3600 (giờ)
            return total + (Number(current) || 0) * Math.pow(60, index);
        }, 0);
}
