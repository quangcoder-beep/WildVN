/**
 * authStore.ts — Quản lý trạng thái xác thực (Authentication State).
 *
 * Kiến trúc bảo mật:
 *  - JWT được lưu trong HttpOnly Cookie do Server set (không thể đọc bằng JS → chống XSS).
 *  - Store này CHỈ lưu thông tin User để hiển thị UI (tên, email, avatar...).
 *  - Token TUYỆT ĐỐI không được lưu trong localStorage, sessionStorage, hay document.cookie thủ công.
 *  - Mọi API call đều dùng credentials: 'include' để trình duyệt tự gửi cookie.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError } from "@/app/_shared/lib/errorParser";

// ─── Types ───────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  conservationIdentity: string | null;
  headphonePreference: boolean;
}

interface AuthState {
  // State — chỉ lưu thông tin user để render UI
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setLoading: (isLoading: boolean) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

// ─── Store ───────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            // credentials: 'include' — BẮT BUỘC để trình duyệt nhận Set-Cookie từ server
            // và tự động gửi cookie đó trong mọi request tiếp theo.
            credentials: "include",
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            if (errorData?.message) throw new ApiError(errorData);
            throw new Error("Đăng nhập thất bại");
          }

          // Server trả về { user: {...} } — KHÔNG có token trong body (token đã trong cookie)
          const data = await res.json();

          set({
            user: data.user,
            isLoggedIn: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          if (error.name === "TypeError" && error.message.includes("fetch")) {
            throw new Error("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
          }
          throw error;
        }
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            method: "GET",
            credentials: "include",
          });

          if (!res.ok) {
            set({ user: null, isLoggedIn: false, isLoading: false });
            return;
          }

          const data = await res.json();
          set({
            user: data.user,
            isLoggedIn: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ user: null, isLoggedIn: false, isLoading: false });
        }
      },

      logout: async () => {
        try {
          // Gọi API logout để server xóa cookie HttpOnly phía server-side.
          // Client KHÔNG thể tự xóa HttpOnly cookie bằng JS → phải nhờ server.
          await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch {
          // Kể cả request logout thất bại (mất mạng) vẫn xóa state local
        } finally {
          set({ user: null, isLoggedIn: false });
        }
      },

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "wildvn-auth",
      // Chỉ persist thông tin user để hiển thị UI sau khi refresh trang.
      // isLoggedIn được suy ra từ sự tồn tại của cookie (kiểm tra ở middleware).
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
