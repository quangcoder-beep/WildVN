import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | WildVN",
    default: "Đăng nhập | WildVN",
  },
  description:
    "Đăng nhập hoặc tạo tài khoản WildVN để bắt đầu hành trình khám phá đa dạng sinh học Việt Nam.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No Navbar, no AI Chat — just the raw auth pages.
  // The root layout.tsx provides <html> and <body>.
  return <>{children}</>;
}
