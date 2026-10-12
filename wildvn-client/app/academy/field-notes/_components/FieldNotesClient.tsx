"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Filter, Loader2, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ACTIVITY_LABELS,
  CONSERVATION_LABELS,
  DIET_LABELS,
  HABITAT_LABELS,
} from "@/app/_shared/constants/species";
import { getImageUrl } from "@/app/_shared/lib/media";
import { speciesApi, SpeciesFacets, SpeciesSummary } from "@/app/_shared/services/api";
import {
  getAvailableFacetOptions,
  getSpeciesDescription,
  getTotalPages,
} from "../../_lib/academy-data";

const PAGE_SIZE = 24;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function FieldNotesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const page = parsePage(searchParams.get("page"));
  const activeFilters = useMemo(
    () => ({
      status: searchParams.get("status") || "",
      category: searchParams.get("category") || "",
      diet: searchParams.get("diet") || "",
      habitat: searchParams.get("habitat") || "",
      activityPattern: searchParams.get("activityPattern") || "",
    }),
    [searchParams],
  );

  const [mounted, setMounted] = useState(false);
  const [speciesList, setSpeciesList] = useState<SpeciesSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<SpeciesFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);

    const filters: Record<string, string> = {};
    if (query) filters.q = query;
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) filters[key] = value;
    });

    speciesApi
      .getSpecies(page, PAGE_SIZE, filters)
      .then((response) => {
        if (!isCurrent) return;
        if (!response.success) {
          setError(response.message || "Không thể tải sổ tay thực địa.");
          return;
        }
        setSpeciesList(response.data || []);
        setTotal(response.pagination?.total ?? response.data?.length ?? 0);
      })
      .catch(() => {
        if (isCurrent) setError("Không thể kết nối tới dữ liệu sinh vật học.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeFilters, page, query, reloadKey]);

  useEffect(() => {
    let isCurrent = true;
    speciesApi
      .getFacets()
      .then((response) => {
        if (isCurrent && response.success) setFacets(response.data);
      })
      .catch(() => {
        // Filter groups remain hidden when the optional facets request fails.
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  const updateQuery = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    if (name !== "page") params.delete("page");

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const totalPages = getTotalPages(total, PAGE_SIZE);
  const hasActiveFilter = Boolean(query || Object.values(activeFilters).some(Boolean));

  const facetGroups = [
    {
      key: "status" as const,
      label: "TÌNH TRẠNG",
      options: getAvailableFacetOptions(facets?.statuses),
      labels: Object.fromEntries(Object.entries(CONSERVATION_LABELS).map(([key, value]) => [key, value.label])),
    },
    {
      key: "category" as const,
      label: "NHÓM",
      options: getAvailableFacetOptions(facets?.categories),
      labels: {},
    },
    {
      key: "diet" as const,
      label: "CHẾ ĐỘ ĂN",
      options: getAvailableFacetOptions(facets?.diets),
      labels: DIET_LABELS,
    },
    {
      key: "habitat" as const,
      label: "SINH CẢNH",
      options: getAvailableFacetOptions(facets?.habitats),
      labels: HABITAT_LABELS,
    },
    {
      key: "activityPattern" as const,
      label: "HOẠT ĐỘNG",
      options: getAvailableFacetOptions(facets?.activityPatterns),
      labels: ACTIVITY_LABELS,
    },
  ];

  if (!mounted) return <FieldNotesSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Điều hướng phụ" className="flex items-center gap-4">
        <Link
          href="/academy"
          className="flex items-center gap-2 text-xs font-mono text-[#9A8F7E] hover:text-[#2DD4A8] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          QUAY LẠI GÓC HỌC TẬP
        </Link>
      </nav>

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-[#2DD4A8] tracking-[0.2em] uppercase">
            // SỔ TAY THỰC ĐỊA
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-white leading-tight">
            Tài Liệu Sinh Vật Học
          </h1>
          <p className="font-sans text-sm text-[#9A8F7E] max-w-xl">
            Tra cứu hồ sơ các loài trong cơ sở dữ liệu WildVN. Mỗi thẻ mở trực tiếp hồ sơ đầy đủ của loài.
          </p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 px-6 py-4 rounded-xl flex flex-col justify-center min-w-[200px]">
          <span className="font-mono text-[9px] text-[#9A8F7E] uppercase">KẾT QUẢ CƠ SỞ DỮ LIỆU</span>
          <span className="font-sans font-bold text-2xl text-white mt-1">
            {total} <span className="text-sm font-normal text-[#9A8F7E]">loài</span>
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4 bg-[#070707] border border-white/5 p-4 rounded-xl">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A8F7E]" />
          <input
            type="search"
            placeholder="Tìm theo tên loài hoặc tên khoa học..."
            value={query}
            onChange={(event) => updateQuery("q", event.target.value)}
            className="w-full bg-black/50 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2DD4A8] transition-colors"
            aria-label="Tìm kiếm loài"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
          {facetGroups.map((group) => {
            if (group.options.length === 0) return null;
            return (
              <nav key={group.key} aria-label={`Bộ lọc ${group.label.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-[#9A8F7E] mr-2 flex items-center gap-1.5 min-w-[100px]">
                  <Filter className="w-3 h-3" /> {group.label}:
                </span>
                <button
                  onClick={() => updateQuery(group.key, "")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    !activeFilters[group.key]
                      ? "bg-white text-black font-semibold"
                      : "bg-white/5 border border-white/5 text-[#9A8F7E] hover:text-white"
                  }`}
                >
                  Tất cả
                </button>
                {group.options.map(({ value, count }) => {
                  const isActive = activeFilters[group.key] === value;
                  const statusColor = group.key === "status" ? CONSERVATION_LABELS[value]?.color : undefined;
                  return (
                    <button
                      key={value}
                      onClick={() => updateQuery(group.key, value)}
                      style={isActive && statusColor ? { borderColor: statusColor, color: statusColor } : undefined}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                        isActive
                          ? "bg-white/5 font-semibold"
                          : "border-white/5 bg-white/5 text-[#9A8F7E] hover:text-white"
                      }`}
                    >
                      {group.labels[value] || value} <span className="opacity-60">({count})</span>
                    </button>
                  );
                })}
              </nav>
            );
          })}
        </div>
      </section>

      <div aria-live="polite" className="sr-only">
        Hiển thị {speciesList.length} trong tổng số {total} loài sinh vật
      </div>

      {error ? (
        <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-8 text-center">
          <p className="font-sans text-sm text-red-200">{error}</p>
          <button
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-xs text-red-200 hover:bg-red-400/10"
          >
            Thử lại
          </button>
        </section>
      ) : loading ? (
        <FieldNotesGridSkeleton />
      ) : speciesList.length === 0 ? (
        <section className="rounded-2xl border border-white/5 bg-[#050505] p-12 text-center">
          <p className="font-serif text-2xl text-white">Chưa có hồ sơ phù hợp</p>
          <p className="mt-2 font-sans text-sm text-[#9A8F7E]">
            {hasActiveFilter ? "Thử thay đổi từ khóa hoặc bộ lọc." : "Cơ sở dữ liệu chưa có loài để hiển thị."}
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
            <AnimatePresence mode="popLayout">
              {speciesList.map((species, index) => {
                const label = CONSERVATION_LABELS[species.conservationStatus] || {
                  label: "Chưa cập nhật",
                  color: "#6B7280",
                };
                const description = getSpeciesDescription(species);
                const imageUrl = getImageUrl(species.thumbnailUrl || species.images?.[0]);
                const habitatValues = Array.isArray(species.habitatType)
                  ? species.habitatType
                  : species.habitat
                    ? [species.habitat]
                    : [];

                return (
                  <motion.article
                    key={species.slug || species.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.35, delay: index * 0.02 }}
                    className="rounded-2xl border bg-[#050505] p-5 flex flex-col justify-between gap-5 relative overflow-hidden group min-h-[360px] border-white/5 hover:border-[#2DD4A8]/30 transition-all duration-300"
                  >
                    <Link href={`/species/${encodeURIComponent(species.slug)}`} className="absolute inset-0 z-0" aria-label={`Mở hồ sơ ${species.name}`} />
                    <div className="absolute inset-0 bg-[#2DD4A8]/[0.01] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="relative z-10 h-40 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] pointer-events-none">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={species.nameVn || species.name || "Ảnh loài"}
                          loading="lazy"
                          className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-wider text-[#9A8F7E]">
                          Ảnh chưa cập nhật
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4 z-10 pointer-events-none">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-[9px] text-[#9A8F7E] uppercase">
                            {species.category || "CHƯA PHÂN NHÓM"}
                          </span>
                          <h3 className="font-sans font-bold text-lg text-white mt-1 group-hover:text-[#2DD4A8] transition-colors">
                            {species.nameVn || species.name || "Chưa có tên"}
                          </h3>
                          <span className="font-mono text-xs italic text-[#9A8F7E] truncate">
                            {species.scientificName || "Danh pháp đang cập nhật"}
                          </span>
                        </div>

                        <span
                          style={{ borderColor: label.color, color: label.color }}
                          className="font-mono text-[9px] border px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                          title={label.label}
                        >
                          {species.conservationStatus || "N/A"}
                        </span>
                      </div>

                      <p className="font-sans text-xs text-[#9A8F7E] leading-relaxed mt-2 line-clamp-4">
                        {description || "Mô tả chưa có trong cơ sở dữ liệu."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-white/5 pt-4 z-10 pointer-events-none">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[9px] text-[#9A8F7E] uppercase">SINH CẢNH:</span>
                        <div className="flex flex-wrap gap-1">
                          {habitatValues.length > 0 ? habitatValues.map((habitat: string) => (
                            <span key={habitat} className="text-[10px] font-sans text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              {HABITAT_LABELS[habitat] || habitat}
                            </span>
                          )) : (
                            <span className="text-[10px] font-sans text-[#9A8F7E]">Chưa cập nhật</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#2DD4A8] uppercase">MỞ HỒ SƠ →</span>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </section>

          {totalPages > 1 && (
            <nav aria-label="Phân trang sổ tay thực địa" className="flex items-center justify-center gap-4 pb-24">
              <button
                disabled={page <= 1}
                onClick={() => updateQuery("page", String(page - 1))}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-30 hover:border-[#2DD4A8]/40"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Trang trước
              </button>
              <span className="font-mono text-xs text-[#9A8F7E]">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => updateQuery("page", String(page + 1))}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-30 hover:border-[#2DD4A8]/40"
              >
                Trang sau <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function FieldNotesSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-12 animate-pulse">
      <div className="h-6 w-32 bg-zinc-900 rounded-lg" />
      <div className="h-12 w-64 bg-zinc-900 rounded-xl" />
      <div className="h-10 w-full bg-zinc-900 rounded-lg" />
      <FieldNotesGridSkeleton />
    </div>
  );
}

function FieldNotesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-80 bg-zinc-900 rounded-2xl flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
        </div>
      ))}
    </div>
  );
}
