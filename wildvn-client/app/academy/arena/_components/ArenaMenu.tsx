"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, Database } from "lucide-react";

interface ArenaMenuProps {
  dueSpeciesCount: number;
  isLoading: boolean;
  hasQuizContent: boolean;
  progressStatus: "idle" | "available" | "unauthenticated" | "unavailable";
  onStartFlashcards: () => void;
}

export function ArenaMenu({
  dueSpeciesCount,
  isLoading,
  hasQuizContent,
  progressStatus,
  onStartFlashcards,
}: ArenaMenuProps) {
  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs text-[#2DD4A8] tracking-[0.2em] uppercase">
          // ĐẤU TRƯỜNG ÔN TẬP
        </span>
        <h1 className="font-serif text-4xl md:text-5xl font-light text-white leading-tight">
          Thử Thách Nhận Diện
        </h1>
        <p className="font-sans text-sm text-[#9A8F7E] max-w-xl">
          Ôn lại hồ sơ sinh vật được tải trực tiếp từ cơ sở dữ liệu WildVN. Nội dung quiz sẽ chỉ xuất hiện khi được quản trị trong DB.
        </p>
      </div>

      {progressStatus === "unauthenticated" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-4 py-3 text-xs text-amber-200" role="status">
          Tiến trình cá nhân chưa được đồng bộ vì bạn chưa đăng nhập. Bạn vẫn có thể ôn catalog hiện tại.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 md:p-8 rounded-2xl border border-white/5 bg-[#050505] flex flex-col justify-between gap-6 hover:border-emerald-500/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-white">Ôn Tập Thẻ Bài</h3>
            <p className="font-sans text-xs text-[#9A8F7E] leading-relaxed">
              Thẻ bài lấy từ catalog API. Mức độ ghi nhớ được cập nhật trong phiên học hiện tại; dữ liệu review sẽ được đồng bộ khi backend có catalog học tập.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2 gap-3">
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isLoading ? "Đang tải" : `${dueSpeciesCount} loài`}
            </span>
            <button
              onClick={onStartFlashcards}
              disabled={isLoading || dueSpeciesCount === 0}
              className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-full hover:bg-emerald-400 transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Bắt đầu ôn tập
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 rounded-2xl border border-white/5 bg-[#050505] flex flex-col justify-between gap-6 opacity-70 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#2DD4A8]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2DD4A8]/10 border border-[#2DD4A8]/20 flex items-center justify-center text-[#2DD4A8]">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-white">Khảo Sát Thực Địa</h3>
            <p className="font-sans text-xs text-[#9A8F7E] leading-relaxed">
              Chưa có bảng câu hỏi hoặc đáp án trong database. Không hiển thị câu hỏi mẫu để tránh trộn dữ liệu giả với hồ sơ thật.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
            <span className="flex items-center gap-2 font-mono text-[10px] text-[#9A8F7E] uppercase tracking-wider">
              <Database className="h-3.5 w-3.5" /> {hasQuizContent ? "Sẵn sàng" : "Chờ dữ liệu DB"}
            </span>
            <span className="px-4 py-2 rounded-full border border-white/10 text-[#9A8F7E] text-xs">
              Chưa mở
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
