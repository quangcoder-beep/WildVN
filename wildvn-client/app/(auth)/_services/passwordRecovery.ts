const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";
const REQUEST_TIMEOUT_MS = 20_000;

export const RECOVERY_ACCEPTED_MESSAGE = "Nếu tài khoản phù hợp tồn tại, bạn sẽ nhận được email đặt lại mật khẩu.";
export const PASSWORD_RESET_MESSAGE = "Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.";

export class PasswordRecoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordRecoveryError";
  }
}

function endpoint(action: string): string {
  try {
    const base = new URL(API_BASE_URL);
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
      throw new Error("Invalid API address");
    }
    return `${base.toString().replace(/\/$/, "")}/api/auth/${action}`;
  } catch {
    throw new PasswordRecoveryError("Dịch vụ đặt lại mật khẩu chưa được cấu hình. Vui lòng thử lại sau.");
  }
}

function responseError(status: number, action: string): PasswordRecoveryError {
  if (status === 429) return new PasswordRecoveryError("Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.");
  if (status === 503) return new PasswordRecoveryError("Dịch vụ đặt lại mật khẩu tạm thời chưa khả dụng. Vui lòng thử lại sau.");
  if (status === 400 && action === "reset-password") {
    return new PasswordRecoveryError("Liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.");
  }
  if (status === 400) return new PasswordRecoveryError("Vui lòng kiểm tra địa chỉ email rồi thử lại.");
  return new PasswordRecoveryError("Không thể xử lý yêu cầu. Vui lòng thử lại sau.");
}

async function postRecovery(action: string, payload: Record<string, string>, signal: AbortSignal): Promise<void> {
  const url = endpoint(action);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload), credentials: action === "reset-password" ? "include" : "omit", cache: "no-store",
      redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal,
    });
    if (!response.ok) throw responseError(response.status, action);
    const result: unknown = await response.json();
    if (typeof result !== "object" || result === null || !("success" in result) || result.success !== true ||
      !("message" in result) || typeof result.message !== "string") {
      throw new PasswordRecoveryError("Dịch vụ trả về phản hồi không hợp lệ. Vui lòng thử lại sau.");
    }
  } catch (error) {
    if (signal.aborted) throw new DOMException("Request cancelled", "AbortError");
    if (error instanceof PasswordRecoveryError) throw error;
    throw new PasswordRecoveryError(controller.signal.aborted
      ? "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."
      : "Không thể kết nối dịch vụ đặt lại mật khẩu. Vui lòng thử lại sau.");
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", onAbort);
  }
}

export function requestPasswordRecovery(email: string, signal: AbortSignal): Promise<void> {
  return postRecovery("forgot-password", { email }, signal);
}

export function resetPassword(token: string, password: string, signal: AbortSignal): Promise<void> {
  return postRecovery("reset-password", { token, password }, signal);
}
