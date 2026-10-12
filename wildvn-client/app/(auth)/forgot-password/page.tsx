"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, Leaf, CheckCircle } from "lucide-react";
import { AuthBackground } from "../_components/AuthBackground";
import { AuthPanel } from "../_components/AuthPanel";
import { AuthInput } from "../_components/AuthInput";
import { AuthButton } from "../_components/AuthButton";
import { PasswordRecoveryError, RECOVERY_ACCEPTED_MESSAGE, requestPasswordRecovery } from "../_services/passwordRecovery";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const successMessage = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);
  useEffect(() => { if (isDone) successMessage.current?.focus(); }, [isDone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const address = email.trim();
    if (!address || address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setIsLoading(true);
    try {
      await requestPasswordRecovery(address, controller.signal);
      if (!controller.signal.aborted) { setEmail(""); setIsDone(true); }
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
              <h1 ref={successMessage} tabIndex={-1} className="text-xl font-semibold text-white mb-3">Yêu cầu đã được tiếp nhận</h1>
              <p className="text-sm text-white/80 mb-4 leading-relaxed">{RECOVERY_ACCEPTED_MESSAGE}</p>
              <p className="text-sm text-white/60 mb-6">Kiểm tra cả thư rác. Liên kết chỉ dùng một lần và có thời hạn.</p>
              <AuthButton variant="ghost" onClick={() => setIsDone(false)}>Gửi yêu cầu khác</AuthButton>
            </div>
          ) : (
            <>
              <div className="text-center my-6">
                <h1 className="text-xl font-semibold text-white mb-3">Quên mật khẩu?</h1>
                <p className="text-sm text-white/70">Nhập email để yêu cầu liên kết đặt lại mật khẩu.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={isLoading}>
                <AuthInput label="Email" aria-label="Email" type="email" icon={Mail} placeholder="ban@example.com"
                  value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email"
                  required maxLength={254} disabled={isLoading} aria-invalid={Boolean(error)}
                  aria-describedby={error ? "recovery-error" : undefined} />
                {error && <p id="recovery-error" ref={errorMessage} tabIndex={-1} role="alert" className="text-sm text-red-400">{error}</p>}
                <AuthButton type="submit" isLoading={isLoading}>Gửi yêu cầu <ArrowRight aria-hidden="true" className="w-4 h-4" /></AuthButton>
              </form>
            </>
          )}
          <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-[#2DD4A8] hover:text-[#2DD4A8]/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2DD4A8]">
            <ArrowLeft aria-hidden="true" className="w-4 h-4" /> Quay lại đăng nhập
          </Link>
        </AuthPanel>
      </div>
    </div>
  );
}
