import type { Metadata } from "next";
import { Navbar } from "@/app/_shared/layout/Navbar";
import { BFCacheProvider } from "@/app/_shared/components/BFCacheProvider";
import { BFCacheStyleFix } from "@/app/_shared/components/BFCacheStyleFix";
import { AIChatProvider } from "@/app/_shared/components/ai-chat/AIChatProvider";
import { OAuthCallbackHandler } from "@/app/_shared/components/OAuthCallbackHandler";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | WildVN",
    default: "WildVN - Đa dạng sinh học Việt Nam",
  },
  description: "Nền tảng số hóa hệ sinh thái tự nhiên, kết hợp bản đồ tương tác 3D và AI nhận diện động thực vật quý hiếm tại Việt Nam.",
  openGraph: {
    title: "WildVN - Đa dạng sinh học Việt Nam",
    description: "Khám phá thế giới hoang dã qua góc nhìn điện ảnh với bản đồ tương tác 3D.",
    url: "https://wildvn.com",
    siteName: "WildVN",
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans bg-black text-white">
        <BFCacheStyleFix />
        <Suspense fallback={null}>
          <OAuthCallbackHandler />
        </Suspense>
        {/* Navbar hiển thị trên MỌI trang */}
        <Navbar />
        <BFCacheProvider>
          <AIChatProvider>
            {children}
          </AIChatProvider>
        </BFCacheProvider>
      </body>
    </html>
  );
}
