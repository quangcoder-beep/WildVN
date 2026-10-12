"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, ArrowRight, Leaf } from "lucide-react";

import { AuthBackground } from "../_components/AuthBackground";
import { AuthPanel } from "../_components/AuthPanel";
import { AuthInput } from "../_components/AuthInput";
import { AuthButton } from "../_components/AuthButton";
import { AuthDivider } from "../_components/AuthDivider";
import { SocialAuthButtons } from "../_components/SocialAuthButtons";
import { PasswordStrengthBar } from "../_components/PasswordStrengthBar";
import { ApiError } from "@/app/_shared/lib/errorParser";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!username.trim()) newErrors.username = "Vui lòng nhập tên người dùng";
    else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
      newErrors.username = "3-30 ký tự, chỉ chữ cái, số và dấu gạch dưới";

    if (!email.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Email không hợp lệ";

    if (!password) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6)
      newErrors.password = "Mật khẩu ít nhất 6 ký tự";

    if (password !== confirmPassword)
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";



    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
        // credentials: 'include' — để server có thể set HttpOnly Cookie ngay sau khi đăng ký
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (errorData && errorData.message) {
          throw new ApiError(errorData);
        }
        throw new Error("Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
      }

      // Điều hướng về trang đăng nhập khi thành công
      router.push("/login?registered=true");
    } catch (error: any) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        setErrors({ auth: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau." });
      } else {
        setErrors({ auth: error.message || "Đã xảy ra lỗi kết nối." });
      }
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
              Tham gia cộng đồng
            </h1>
            <p className="text-sm text-white/45">
              Trở thành nhà thám hiểm thiên nhiên Việt Nam
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <AuthInput
              label="Tên người dùng"
              type="text"
              icon={User}
              placeholder="explorer_vn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              autoComplete="username"
            />

            <AuthInput
              label="Email"
              type="email"
              icon={Mail}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <div className="space-y-2">
              <AuthInput
                label="Mật khẩu"
                type="password"
                icon={Lock}
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
              />
              <PasswordStrengthBar password={password} />
            </div>

            <AuthInput
              label="Xác nhận mật khẩu"
              type="password"
              icon={Lock}
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />



            {errors.auth && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                {errors.auth}
              </div>
            )}

            {/* Submit */}
            <AuthButton type="submit" isLoading={isLoading} className="mt-2">
              <span>Bắt Đầu Hành Trình</span>
              <ArrowRight className="w-4 h-4" />
            </AuthButton>
          </form>

          {/* Divider */}
          <AuthDivider />

          {/* Social Login */}
          <SocialAuthButtons />

          {/* Login CTA */}
          <p className="text-center text-sm text-white/40 mt-8">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="text-[#2DD4A8] hover:text-[#2DD4A8]/80 font-medium transition-colors"
            >
              Đăng nhập
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
            // Gia nhập đội ngũ
          </p>
          <h2 className="text-5xl font-bold text-white/10 tracking-tight leading-none">
            BẢO TỒN
          </h2>
        </motion.div>
      </div>
    </div>
  );
}
