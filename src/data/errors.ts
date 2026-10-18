import { emojis } from "./emojis";

export default {
    // User Errors
    USER_MISSING_ITEM: "Người dùng không có đủ vật phẩm !",
    USER_MISSING_BANNER: "Người dùng không có banner !",
    USER_MISSING_PERMISSION: "Bạn không có đủ quyền để thực hiện điều này !",
    INVALID_USER: "Người dùng không hợp lệ !",

    // Server & Channel Errors
    INVALID_GUILD: "Server không tồn tại !",
    INVALID_CHANNEL: "Kênh không tồn tại !",

    // Misc Errors

    INVALID_EMOJI: "Emoji không hợp lệ !",
    INVALID_AMOUNT: "Số lượng không hợp lệ !",
    INVALID_IMAGE: "Ảnh không hợp lệ !",
    INVALID_ROLE: "Vai trò không hợp lệ !",
    INVALID_DURATION: "Thời gian không hợp lệ !",
    INVALID_INTERACTION: "Bạn không có quyền sử dụng tương tác này !",
    INVALID_COLOR: "Mã màu không hợp lệ",
    TIMED_OUT: "Đã hết thời gian !",
    UNKNOWN: "Lỗi không xác định !",
} as const;
