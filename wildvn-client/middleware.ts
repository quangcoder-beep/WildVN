/**
 * middleware.ts — Next.js Edge Middleware bảo vệ route.
 *
 * Cách hoạt động:
 *  1. Đọc cookie "wildvn-auth-token" (do server set dưới dạng HttpOnly).
 *  2. Nếu truy cập route bảo mật mà không có cookie → redirect /login.
 *  3. Nếu đã login mà vào /login hoặc /register → redirect /.
 *
 * Lưu ý: Middleware chỉ kiểm tra SỰ TỒN TẠI của cookie, không decode JWT.
 * Việc xác thực JWT thực sự do JwtAuthFilter ở Backend đảm nhiệm.
 * Nếu cookie hết hạn/giả mạo, Backend sẽ trả 401 và Frontend phải xử lý redirect.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Các route cần đăng nhập.
 * User chưa auth sẽ bị redirect về /login?redirect=<đường dẫn gốc>
 */
const PROTECTED_ROUTES = ["/profile", "/settings", "/academy"];

/**
 * Các route chỉ dành cho user chưa đăng nhập.
 * User đã auth sẽ bị redirect về /
 */
const AUTH_ONLY_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Tên cookie phải khớp với COOKIE_NAME trong AuthController.java
  const authCookie = request.cookies.get("wildvn-auth-token");
  const isAuthenticated = !!authCookie?.value;

  // 1. Route bảo mật → redirect đến /login nếu chưa có cookie
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // NOTE: Không chặn user đã đăng nhập vào /login hoặc /register
  // vì họ có thể muốn đổi tài khoản hoặc đăng nhập lại.

  return NextResponse.next();
}

// Chỉ chạy middleware trên các route này để giảm overhead
export const config = {
  matcher: [
    "/profile/:path*",
    "/settings/:path*",
    "/academy/:path*",
    "/login",
    "/register",
  ],
};
