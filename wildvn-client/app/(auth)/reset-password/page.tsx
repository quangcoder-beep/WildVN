"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuthStore } from "@/app/_shared/stores/authStore";
import { Lock, ArrowRight, Leaf, CheckCircle } from "lucide-react";
import { AuthBackground } from "../_components/AuthBackground";
import { AuthPanel } from "../_components/AuthPanel";
import { AuthInput } from "../_components/AuthInput";
import { AuthButton } from "../_components/AuthButton";
import { PasswordStrengthBar } from "../_components/PasswordStrengthBar";
import { PasswordRecoveryError, PASSWORD_RESET_MESSAGE, resetPassword } from "../_services/passwordRecovery";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");
  const [localCleanupWarning, setLocalCleanupWarning] = useState("");
  const capturedToken = useRef(false);
  const request = useRef<AbortController | null>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const successMessage = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    function captureFragment() {
      const fragment = window.location.hash;
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
      const match = /^#token=([A-Za-z0-9_-]{43})$/.exec(fragment);
      request.current?.abort();
      request.current = null;
      setIsLoading(false);
      setIsDone(false);
      setPassword("");
      setConfirmPassword("");
      setError("");
      setLocalCleanupWarning("");
      setToken(match ? match[1] : null);
      setTokenLoaded(true);
    }
    if (!capturedToken.current) {
      capturedToken.current = true;
      captureFragment();
    }
    window.addEventListener("hashchange", captureFragment);
    return () => {
      window.removeEventListener("hashchange", captureFragment);
      request.current?.abort();
    };
  }, []);
  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);
  useEffect(() => { if (isDone) successMessage.current?.focus(); }, [isDone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || !token) return;
    if (!password.trim() || password.length < 6 || new TextEncoder().encode(password).length > 1024) {
      setError("Mật khẩu cần ít nhất 6 ký tự, không chỉ chứa khoảng trắng và tối đa 1024 byte UTF-8.");
      return;
    }
    if (password !== confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; }
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setIsLoading(true);
    try {
      await resetPassword(token, password, controller.signal);
      if (!controller.signal.aborted) {
        setPassword(""); setConfirmPassword(""); setToken(null); setIsDone(true);
        try {
          useAuthStore.setState({ user: null, isLoggedIn: false, isLoading: false });
        } catch {
          setLocalCleanupWarning("Mật khẩu đã đổi, nhưng trình duyệt không thể lưu trạng thái đăng xuất. Vui lòng tải lại trang trước khi đăng nhập.");
        }
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof PasswordRecoveryError
        ? failure.message : "Không thể xử lý yêu cầu. Vui lòng thử lại sau.");
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <AuthBackground />
      <div className="relative z-10 w-full">
        <AuthPanel>
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#2DD4A8]/15 flex items-center justify-center">
              <Leaf aria-hidden="true" className="w-5 h-5 text-[#2DD4A8]" />
            </div>
            <span className="text-lg font-bold tracking-tight">WildVN</span>
          </div>
          {isDone ? (
            <div className="text-center py-4" role="status" aria-live="polite">
              <CheckCircle aria-hidden="true" className="mx-auto w-12 h-12 text-[#2DD4A8] mb-6" />
              <h1 ref={successMessage} tabIndex={-1} className="text-xl font-semibold text-white mb-3">Đã cập nhật mật khẩu</h1>
              <p className="text-sm text-white/80 mb-6">{PASSWORD_RESET_MESSAGE}</p>
              {localCleanupWarning && <p role="alert" className="text-sm text-amber-300 mb-6">{localCleanupWarning}</p>}
              <Link href="/login" className="text-sm text-[#2DD4A8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DD4A8]">Đăng nhập ngay →</Link>
            </div>
          ) : !tokenLoaded ? (
            <p role="status" className="text-center py-6 text-sm text-white/70">Đang kiểm tra liên kết...</p>
          ) : !token ? (
            <div className="text-center py-6">
              <h1 className="text-xl font-semibold text-white mb-3">Liên kết không hợp lệ</h1>
              <p role="alert" className="text-sm text-white/80 mb-6">Mở liên kết từ email để đặt lại mật khẩu. Nếu đã tải lại trang, hãy mở lại email hoặc yêu cầu liên kết mới.</p>
              <Link href="/forgot-password" className="text-sm text-[#2DD4A8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DD4A8]">Yêu cầu liên kết mới →</Link>
            </div>
          ) : (
            <>
              <div className="text-center my-6">
                <h1 className="text-xl font-semibold text-white mb-2">Đặt lại mật khẩu</h1>
                <p className="text-sm text-white/70">Tạo mật khẩu mới cho tài khoản.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={isLoading}>
                <div className="space-y-2">
                  <AuthInput label="Mật khẩu mới" aria-label="Mật khẩu mới" type="password" icon={Lock}
                    placeholder="Ít nhất 6 ký tự" value={password} onChange={(event) => setPassword(event.target.value)}
                    required minLength={6} maxLength={1024} autoComplete="new-password" disabled={isLoading}
                    aria-invalid={Boolean(error)} aria-describedby={error ? "reset-error" : undefined} />
                  <PasswordStrengthBar password={password} />
                </div>
                <AuthInput label="Xác nhận mật khẩu" aria-label="Xác nhận mật khẩu" type="password" icon={Lock}
                  placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
                  required maxLength={1024} autoComplete="new-password" disabled={isLoading}
                  aria-invalid={Boolean(error)} aria-describedby={error ? "reset-error" : undefined} />
                {error && <p id="reset-error" ref={errorMessage} tabIndex={-1} role="alert" className="text-sm text-red-400">{error}</p>}
                <AuthButton type="submit" isLoading={isLoading}>Cập nhật mật khẩu <ArrowRight aria-hidden="true" className="w-4 h-4" /></AuthButton>
              </form>
              <Link href="/forgot-password" className="mt-6 block text-center text-sm text-[#2DD4A8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DD4A8]">Yêu cầu liên kết mới →</Link>
            </>
          )}
        </AuthPanel>
      </div>
    </div>
  );
}
