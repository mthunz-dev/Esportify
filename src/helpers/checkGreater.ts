const checkGreater = (...nums: number[]) => {
    for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i] > nums[i + 1]) return true;
    }

    return false;
};

export default checkGreater;
