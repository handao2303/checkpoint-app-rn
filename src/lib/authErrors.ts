const VIETNAMESE_MAP: Record<string, string> = {
  "Invalid login credentials": "Email hoặc mật khẩu không đúng.",
  "Email not confirmed": "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.",
  "User already registered": "Email này đã được đăng ký.",
  "Invalid email": "Email không hợp lệ.",
  "Password should be at least 6 characters": "Mật khẩu phải có ít nhất 6 ký tự.",
  "identity_not_found": "Không tìm thấy tài khoản.",
  "identity_already_exists": "Tài khoản Google này đã được liên kết với người dùng khác.",
  "signup_disabled": "Đăng ký hiện đang tạm tắt.",
  "over_email_send_rate_limit": "Gửi email quá nhanh. Vui lòng thử lại sau.",
};

export function authErrorMessage(error: { code?: string | null; message?: string | null }): string {
  if (error.code && VIETNAMESE_MAP[error.code]) return VIETNAMESE_MAP[error.code];
  if (error.message && VIETNAMESE_MAP[error.message]) return VIETNAMESE_MAP[error.message];
  return error.message ?? "Có lỗi xảy ra. Vui lòng thử lại.";
}
