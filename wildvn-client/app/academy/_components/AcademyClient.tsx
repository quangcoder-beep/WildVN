"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Database, LockKeyhole, Sparkles } from "lucide-react";
import { academyApi, AcademyOverview } from "@/app/_shared/services/api";
import { CONSERVATION_LABELS } from "@/app/_shared/constants/species";
import { getImageUrl } from "@/app/_shared/lib/media";
import { useAcademyStore } from "../_hooks/useAcademyStore";
import { BentoCard, BentoGrid } from "./BentoGrid";

export function AcademyClient() {
  const [overview, setOverview] = useState<AcademyOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  const { progressStatus, fetchFromServer } = useAcademyStore();

  useEffect(() => {
    fetchFromServer();
    academyApi
      .getOverview()
      .then((response) => {
        if (response.success) setOverview(response.data);
        else setOverviewError(true);
      })
      .catch(() => setOverviewError(true));
  }, [fetchFromServer]);

  const speciesCountLabel = overview
    ? `${overview.speciesCount.toLocaleString("vi-VN")} loài trong DB`
    : "Đang tải catalog";

  return (
    <div className="flex flex-col gap-12 pb-24">
      {progressStatus === "unauthenticated" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-4 py-3 text-xs text-amber-200" role="status">
          Tiến trình cá nhân chỉ được đồng bộ sau khi bạn đăng nhập. Catalog sinh vật vẫn có thể tra cứu tự do.
        </div>
      )}

      {overviewError && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 px-4 py-3 text-xs text-red-200" role="alert">
          Không thể tải tổng quan dữ liệu. Bạn vẫn có thể mở Sổ Tay Thực Địa để thử lại.
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Tổng quan dữ liệu học tập">
        <div className="rounded-xl border border-white/5 bg-[#070707] px-5 py-4">
          <Database className="h-4 w-4 text-[#2DD4A8]" />
          <p className="mt-3 font-mono text-[10px] uppercase text-[#9A8F7E]">CATALOG THẬT</p>
          <p className="mt-1 font-sans text-sm text-white">{speciesCountLabel}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#070707] px-5 py-4">
          <Sparkles className="h-4 w-4 text-[#2DD4A8]" />
          <p className="mt-3 font-mono text-[10px] uppercase text-[#9A8F7E]">GỢI Ý TỪ CATALOG</p>
          <p className="mt-1 font-sans text-sm text-white">{overview?.featuredSpecies.length ?? "Đang tải"} hồ sơ từ DB</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#070707] px-5 py-4">
          <BookOpen className="h-4 w-4 text-[#2DD4A8]" />
          <p className="mt-3 font-mono text-[10px] uppercase text-[#9A8F7E]">NỘI DUNG HỌC</p>
          <p className="mt-1 font-sans text-sm text-white">Tra cứu theo dữ liệu loài</p>
        </div>
      </section>

      <BentoGrid>
        <BentoCard
          index={0}
          title="Sổ Tay Thực Địa"
          subtitle="Catalog sinh vật từ database"
          description="Tra cứu, lọc và mở hồ sơ chi tiết của các loài đã được chuẩn hóa trong WildVN."
          href="/academy/field-notes"
          badge={overview ? `${overview.speciesCount.toLocaleString("vi-VN")} loài` : "Đang tải"}
          className="md:col-span-2 md:row-span-2 min-h-[380px]"
        />

        <BentoCard
          index={1}
          title="Đấu Trường Ôn Tập"
          subtitle="Flashcard từ catalog thật"
          description="Ôn lại những hồ sơ sinh vật được tải trực tiếp từ API Spring Boot."
          href="/academy/arena"
          badge="Mở catalog"
          className="md:col-span-2 min-h-[220px]"
        />

        <BentoCard
          index={2}
          title="Cuộc Viễn Chinh"
          subtitle="Chưa có nội dung trong DB"
          description="Chưa có bảng expedition hoặc chương học trong cơ sở dữ liệu. Module sẽ mở khi nội dung được quản trị hóa."
          disabled
          className="md:col-span-1 min-h-[220px]"
        />

        <BentoCard
          index={3}
          title="Phòng Lab Âm Thanh"
          subtitle="Chưa có audio asset trong DB"
          description="Chưa có dữ liệu âm thanh được liên kết trong hệ thống."
          disabled
          className="md:col-span-1 min-h-[220px]"
        />
      </BentoGrid>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#9A8F7E]">GỢI Ý TỪ CATALOG</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        {overview?.featuredSpecies?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.featuredSpecies.slice(0, 6).map((species) => {
              const status = species.conservationStatus;
              const statusLabel = status ? CONSERVATION_LABELS[status]?.label || status : "Chưa cập nhật";
              const imageUrl = getImageUrl(species.thumbnailUrl || species.images?.[0]);
              return (
                <Link
                  key={species.slug}
                  href={`/species/${encodeURIComponent(species.slug)}`}
                  className="group rounded-xl border border-white/5 bg-[#050505] p-4 hover:border-[#2DD4A8]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center font-mono text-[8px] text-[#9A8F7E]">N/A</div>
                      )}
                    </div>
                    <div>
                      <p className="font-sans text-sm font-semibold text-white group-hover:text-[#2DD4A8]">{species.nameVn || species.name}</p>
                      <p className="mt-1 font-mono text-[10px] italic text-[#9A8F7E]">{species.scientificName || "Danh pháp đang cập nhật"}</p>
                    </div>
                    <span className="font-mono text-[9px] text-[#9A8F7E]">{statusLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-[#050505] p-8 text-center">
            <LockKeyhole className="mx-auto h-5 w-5 text-[#9A8F7E]" />
            <p className="mt-3 font-sans text-sm text-[#9A8F7E]">Catalog chưa trả về hồ sơ để gợi ý.</p>
          </div>
        )}
      </section>
    </div>
  );
}
