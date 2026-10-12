"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Menu,
  LogIn,
  User,
  Settings,
  LogOut,
  Shield,
  Heart,
} from "lucide-react";
import styles from "@/app/_shared/styles/glass.module.css";
import { useAuthStore } from "@/app/_shared/stores/authStore";

const NAV_LINKS = [
  { name: "Trang chủ", href: "/" },
  { name: "Tra cứu", href: "/search" },
  { name: "Sách Đỏ", href: "/species" },
  { name: "Góc học tập", href: "/academy" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { isLoggedIn, user, logout } = useAuthStore();

  // Đóng mobile menu khi chuyển trang
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide global navbar on species detail pages and auth pages for immersive experience
  const HIDDEN_PREFIXES = [
    "/species/",
    "/ecosystems/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];
  if (pathname && HIDDEN_PREFIXES.some((p) => pathname.startsWith(p) && pathname !== "/species" && pathname !== "/ecosystems")) {
    return null;
  }

  return (
    <>
      {/* Desktop Navbar */}
      <motion.nav
        initial={{ y: -50, opacity: 0, x: "-50%" }}
        animate={{ y: 0, opacity: 1, x: "-50%" }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        className={`fixed top-8 left-1/2 z-50 ${styles.macGlass} rounded-full px-8 py-3.5 hidden md:flex items-center gap-10 text-white/90 shadow-lg`}
      >
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex flex-col items-center relative group cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-base tracking-wide transition-all ${
                    isActive
                      ? "text-white font-medium"
                      : "text-white/80 group-hover:text-white font-normal"
                  }`}
                >
                  {link.name}
                </span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="active-line"
                  className="w-full h-[3px] bg-white absolute -bottom-[14px] rounded-t-full"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </Link>
          );
        })}
      </motion.nav>

      {/* Mobile Menu Button */}
      <motion.button
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        className={`fixed top-6 left-6 z-50 md:hidden ${styles.macGlass} rounded-full p-2.5 text-white cursor-pointer hover:bg-white/10 transition-colors`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Menu điều hướng"
      >
        <Menu className="w-5 h-5" />
      </motion.button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md md:hidden flex flex-col items-center justify-center gap-6"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-2xl font-medium transition-colors ${
                  isActive ? "text-[#2DD4A8]" : "text-white/70 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {/* Mobile auth section */}
          <div className="border-t border-white/10 pt-6 mt-2">
            {isLoggedIn ? (
              <button
                onClick={async () => {
                   await logout();
                   setIsMobileMenuOpen(false);
                }}
                className="text-xl text-white/50 hover:text-white transition-colors"
              >
                Đăng xuất
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xl text-[#2DD4A8] font-medium"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {/* Right Section: Auth + Language Toggle */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="fixed top-8 right-12 z-50 hidden md:flex items-center gap-5"
      >
        {/* Auth Button / Avatar */}
        {isLoggedIn && user ? (
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2DD4A8] to-[#1a9d7d] flex items-center justify-center text-black font-bold text-sm ring-2 ring-white/10 group-hover:ring-white/25 transition-all">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full right-0 mt-3 w-64 ${styles.macGlass} rounded-2xl overflow-hidden shadow-2xl`}
                >
                  {/* User Info Header */}
                  <div className="px-4 py-4 border-b border-white/[0.08]">
                    <p className="text-sm font-semibold text-white">
                      {user.username}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <Shield className="w-3.5 h-3.5 text-[#2DD4A8]" />
                      <span className="text-[11px] text-[#2DD4A8] font-medium">
                        Thành viên WildVN
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1.5">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Hồ sơ</span>
                    </Link>
                    <Link
                      href="/profile/favorites"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Heart className="w-4 h-4" />
                      <span>Bộ sưu tập</span>
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Cài đặt</span>
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-white/[0.08] py-1.5">
                    <button
                      onClick={async () => {
                        await logout();
                        setIsProfileOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-white/[0.04] transition-colors w-full cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link
            href="/login"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${styles.macGlass} text-white/80 hover:text-white hover:bg-white/[0.08]`}
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập</span>
          </Link>
        )}

        {/* Language Toggle */}
        <span className="text-white/60 text-sm font-light tracking-widest cursor-pointer hover:text-white transition-colors">
          VN | EN
        </span>
      </motion.div>
    </>
  );
}
