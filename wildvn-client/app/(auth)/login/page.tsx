"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { User, Lock, ArrowLeft, ArrowRight, Leaf } from "lucide-react";
import { useAuthStore } from "@/app/_shared/stores/authStore";

import { AuthBackground } from "../_components/AuthBackground";
import { AuthPanel } from "../_components/AuthPanel";
import { AuthInput } from "../_components/AuthInput";
import { AuthButton } from "../_components/AuthButton";
import { AuthDivider } from "../_components/AuthDivider";
import { SocialAuthButtons } from "../_components/SocialAuthButtons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!username.trim()) newErrors.username = "Vui lòng nhập tên đăng nhập";

    if (!password) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6)
      newErrors.password = "Mật khẩu ít nhất 6 ký tự";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await login(username, password);
      // replace() xóa trang /login khỏi lịch sử → không bị quay lại khi nhấn Back
      // refresh() bắt buộc Next.js re-run middleware với cookie mới vừa được set
      router.replace(redirectTo === "/" ? "/profile" : redirectTo);
      router.refresh();
    } catch (error: any) {
      setErrors({ auth: error.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin." });
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <AuthBackground />

      {/* Back to home */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="fixed top-6 left-6 z-50"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Trang chủ</span>
        </Link>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 w-full">
        <AuthPanel>
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#2DD4A8]/15 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#2DD4A8]" />
            </div>
            <span className="text-lg font-bold tracking-tight">WildVN</span>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-white mb-1.5">
              Chào mừng trở lại
            </h1>
            <p className="text-sm text-white/45">
              Đăng nhập để tiếp tục hành trình
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <AuthInput
              label="Tên đăng nhập"
              type="text"
              icon={User}
              placeholder="explorer_vn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              autoComplete="username"
            />

            <AuthInput
              label="Mật khẩu"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-white/40 hover:text-[#2DD4A8] transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {errors.auth && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                {errors.auth}
              </div>
            )}

            {/* Submit */}
            <AuthButton type="submit" isLoading={isLoading}>
              <span>Đăng Nhập</span>
              <ArrowRight className="w-4 h-4" />
            </AuthButton>
          </form>

          {/* Divider */}
          <AuthDivider />

          {/* Social Login */}
          <SocialAuthButtons />

          {/* Register CTA */}
          <p className="text-center text-sm text-white/40 mt-8">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="text-[#2DD4A8] hover:text-[#2DD4A8]/80 font-medium transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>
        </AuthPanel>

        {/* Decorative editorial text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="hidden md:block fixed bottom-12 left-12 z-10"
        >
          <p className="text-[11px] text-[#2DD4A8]/60 uppercase tracking-[0.25em] font-medium mb-2">
            // Bước vào rừng
          </p>
          <h2 className="text-5xl font-bold text-white/10 tracking-tight leading-none">
            KHÁM PHÁ
          </h2>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
