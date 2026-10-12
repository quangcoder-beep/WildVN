"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, ShieldAlert, Loader2 } from "lucide-react";
import { CONSERVATION_LABELS, DIET_LABELS, HABITAT_LABELS, ACTIVITY_LABELS } from "@/app/_shared/constants/species";
import { SpecimenCard } from "./SpecimenCard";
import styles from "@/app/_shared/styles/glass.module.css";
import { useDebounce } from "@/app/_shared/hooks/useDebounce";
import { speciesApi, SpeciesFacets } from "@/app/_shared/services/api";

const PAGE_SIZE = 24;

export function SpeciesGrid({
  initialStatus,
  initialGroup,
  initialQuery,
  initialDiet = "ALL",
  initialHabitat = "ALL",
  initialActivityPattern = "ALL",
}: {
  initialStatus: string;
  initialGroup: string;
  initialQuery: string;
  initialDiet?: string;
  initialHabitat?: string;
  initialActivityPattern?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [status, setStatus] = useState(initialStatus);
  const [group, setGroup] = useState(initialGroup);
  
  // Gamification filters
  const [diet, setDiet] = useState(initialDiet);
  const [habitat, setHabitat] = useState(initialHabitat);
  const [activityPattern, setActivityPattern] = useState(initialActivityPattern);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (status !== "ALL") params.set("status", status);
    else params.delete("status");

    if (group !== "ALL") params.set("group", group);
    else params.delete("group");

    if (diet !== "ALL") params.set("diet", diet);
    else params.delete("diet");

    if (habitat !== "ALL") params.set("habitat", habitat);
    else params.delete("habitat");

    if (activityPattern !== "ALL") params.set("activityPattern", activityPattern);
    else params.delete("activityPattern");

    if (debouncedSearchTerm) params.set("q", debouncedSearchTerm);
    else params.delete("q");

    if (page > 1) params.set("page", page.toString());
    else params.delete("page");

    const nextQuery = params.toString();
    if (nextQuery === searchParams.toString()) return;

    const newUrl = `${pathname}?${nextQuery}`;
    // Use transition to avoid blocking the main thread during navigation
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [status, group, diet, habitat, activityPattern, debouncedSearchTerm, page, pathname, router, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [status, group, diet, habitat, activityPattern, debouncedSearchTerm]);

  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [facets, setFacets] = useState<SpeciesFacets | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    speciesApi.getFacets()
      .then((response) => {
        if (isMounted && response.success) setFacets(response.data);
      })
      .catch(() => {
        // Leave optional filters empty when the facets endpoint is unavailable.
      });
    return () => { isMounted = false; };
  }, []);

  const groups = useMemo(() => [
    "ALL",
    ...(facets?.categories ?? []).map((facet) => facet.value),
  ], [facets]);

  const DIET_OPTIONS = [
    { value: "ALL", label: "Mọi chế độ ăn" },
    ...(facets?.diets ?? []).map(({ value }) => ({ value, label: DIET_LABELS[value] || "Chưa cập nhật" }))
  ];

  const HABITAT_OPTIONS = [
    { value: "ALL", label: "Mọi môi trường" },
    ...(facets?.habitats ?? []).map(({ value }) => ({ value, label: HABITAT_LABELS[value] || "Chưa cập nhật" }))
  ];

  const ACTIVITY_OPTIONS = [
    { value: "ALL", label: "Mọi thời gian" },
    ...(facets?.activityPatterns ?? []).map(({ value }) => ({ value, label: ACTIVITY_LABELS[value] || "Chưa cập nhật" }))
  ];

  const statusOptions = facets?.statuses ?? [];

  useEffect(() => {
    let isMounted = true;
    
    const fetchSpecies = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters: Record<string, string> = {};
        if (debouncedSearchTerm) filters.q = debouncedSearchTerm;
        if (status !== "ALL") filters.status = status;
        if (group !== "ALL") filters.category = group;
        if (diet !== "ALL") filters.diet = diet;
        if (habitat !== "ALL") filters.habitat = habitat;
        if (activityPattern !== "ALL") filters.activityPattern = activityPattern;
        
        const res = await speciesApi.getSpecies(page, PAGE_SIZE, filters);
        if (res.success && isMounted) {
          setSpeciesList(res.data);
          setTotal(res.pagination?.total ?? res.data.length);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchSpecies();
    
    return () => { isMounted = false; };
  }, [activityPattern, debouncedSearchTerm, diet, group, habitat, page, reloadKey, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="w-full flex-1 flex flex-col items-center px-6 md:px-12 lg:px-24">
      {/* ARIA Live Region for Accessibility */}
      <div aria-live="polite" className="sr-only">
        Hiển thị {speciesList.length} trong tổng số {total} loài sinh vật
      </div>

      {/* Filter Console */}
      <div className="w-full max-w-7xl mb-12 relative z-10">
        <div className={`p-4 md:p-6 rounded-[2rem] ${styles.macGlass} border border-white/10 flex flex-col gap-6 shadow-2xl`}>
          
          {/* Top row: Search & Status Pills */}
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Tìm tên loài, danh pháp khoa học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500/50 rounded-2xl py-3 pl-12 pr-12 text-white placeholder-white/30 outline-none transition-all duration-300"
                aria-label="Tìm kiếm loài"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors text-xs font-medium"
                >
                  XÓA
                </button>
              )}
            </div>

            {/* Conservation Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatus("ALL")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                  status === "ALL" 
                    ? "bg-white/10 border-white/20 text-white" 
                    : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                Tất cả hạng
              </button>
              
              {statusOptions.map(({ value: code }) => {
                const data = CONSERVATION_LABELS[code] || { label: "Chưa cập nhật", color: "#6B7280", description: "" };
                const isActive = status === code;
                return (
                  <button
                    key={code}
                    onClick={() => setStatus(code)}
                    className="relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 overflow-hidden group"
                    style={{
                      backgroundColor: isActive ? `${data.color}20` : "transparent",
                      borderColor: isActive ? data.color : "transparent",
                      color: isActive ? data.color : "rgba(255,255,255,0.5)",
                      borderWidth: "1px",
                      borderStyle: "solid"
                    }}
                  >
                    <span className="relative z-10">{code}</span>
                    <span className="ml-1.5 font-normal text-xs opacity-80 hidden sm:inline-block">
                      {data.label}
                    </span>
                    {!isActive && (
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                        style={{ backgroundColor: data.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom row: Group Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-white/5 pt-4">
            <SlidersHorizontal className="w-4 h-4 text-white/40 shrink-0 mr-2" />
            {groups.map((g) => {
              const count = g === "ALL" 
                ? (total > 0 ? total : "-")
                : (group === g ? total : "-");
                
              return (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                    group === g 
                      ? "bg-white text-black font-medium" 
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{g === "ALL" ? "Tất cả lớp" : g}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    group === g ? "bg-black/10 text-black/70" : "bg-black/40 text-white/40"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Gamification Filters: Diet, Habitat, Activity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
            {/* Diet Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider pl-1">Chế độ ăn</label>
              <div className="relative">
                <select 
                  value={diet} 
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white/80 outline-none transition-colors cursor-pointer"
                >
                  {DIET_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Habitat Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider pl-1">Môi trường sống</label>
              <div className="relative">
                <select 
                  value={habitat} 
                  onChange={(e) => setHabitat(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white/80 outline-none transition-colors cursor-pointer"
                >
                  {HABITAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Activity Pattern Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider pl-1">Thời gian HĐ</label>
              <div className="relative">
                <select 
                  value={activityPattern} 
                  onChange={(e) => setActivityPattern(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white/80 outline-none transition-colors cursor-pointer"
                >
                  {ACTIVITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="w-full max-w-7xl relative z-10 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-12 h-12 text-white/30 animate-spin mb-4" />
            <p className="text-white/50">Đang tải dữ liệu từ máy chủ...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShieldAlert className="w-12 h-12 text-red-500/50 mb-4" />
            <p className="text-white/80 mb-4">Lỗi tải dữ liệu. Vui lòng thử lại.</p>
            <button onClick={() => setReloadKey((current) => current + 1)} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20">Thử lại</button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {speciesList.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {speciesList.map((species, index) => (
                  <SpecimenCard key={species.id} species={species} index={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                  <ShieldAlert className="w-8 h-8 text-white/30" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Không có kết quả trùng khớp</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-6 text-sm">
                  Không tìm thấy mẫu vật nào thỏa mãn bộ lọc hiện tại. Thử thay đổi tình trạng bảo tồn hoặc từ khóa tìm kiếm.
                </p>
                <button
                  onClick={() => {
                    setStatus("ALL");
                    setGroup("ALL");
                    setDiet("ALL");
                    setHabitat("ALL");
                    setActivityPattern("ALL");
                    setSearchTerm("");
                  }}
                  className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 transition-colors"
                >
                  Xóa tất cả bộ lọc
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!loading && !error && totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Phân trang danh sách loài">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-sm text-white/60">Trang {page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
