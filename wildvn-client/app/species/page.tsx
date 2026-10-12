import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { SpeciesGrid } from "./_components/SpeciesGrid";
import { EcosystemGrid } from "@/app/ecosystems/_components/EcosystemGrid";
import { FilmGrain } from "@/app/(home)/_components/Home/FilmGrain";

export const metadata: Metadata = {
  title: "Sách Đỏ",
  description: "Bách khoa toàn thư Sách Đỏ đa dạng sinh học Việt Nam. Khám phá các loài động thực vật quý hiếm cần được bảo vệ.",
};

export default async function SpeciesPage(
  props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const status = typeof searchParams?.status === "string" ? searchParams.status : "ALL";
  const group = typeof searchParams?.group === "string" ? searchParams.group : "ALL";
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const view = typeof searchParams?.view === "string" ? searchParams.view : "species";
  const region = typeof searchParams?.region === "string" ? searchParams.region : "ALL";

  const diet = typeof searchParams?.diet === "string" ? searchParams.diet : "ALL";
  const habitat = typeof searchParams?.habitat === "string" ? searchParams.habitat : "ALL";
  const activityPattern = typeof searchParams?.activityPattern === "string" ? searchParams.activityPattern : "ALL";

  return (
    <main className="min-h-screen bg-[#050505] text-white pt-28 pb-20 relative overflow-hidden flex flex-col">
      <FilmGrain />
      
      {/* Static Ambient Glows - Cinematic, non-intrusive */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Info Section - Server Rendered for SEO & Speed */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mb-6 relative z-10 w-full">
        <span className="text-xs md:text-sm font-semibold tracking-[0.3em] uppercase text-emerald-400/80 mb-3 block">
          // SÁCH ĐỎ ĐA DẠNG SINH HỌC VIỆT NAM
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Bách Khoa Toàn Thư <br className="hidden md:inline" />Các Loài Sinh Vật
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-light max-w-3xl leading-relaxed mb-8">
          Khám phá danh mục các loài động thực vật quý hiếm nằm trong cấp báo động bảo tồn nghiêm ngặt của Sách Đỏ Việt Nam và tổ chức IUCN. Hành trình bảo tồn bắt đầu từ sự thấu hiểu.
        </p>

        {/* View Toggle */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-1">
          <Link 
            href="?view=species"
            className={`px-6 py-3 font-semibold transition-all duration-300 relative ${view === 'species' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
          >
            Danh Sách Loài
            {view === 'species' && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-400" />
            )}
          </Link>
          <Link 
            href="?view=ecosystems"
            className={`px-6 py-3 font-semibold transition-all duration-300 relative ${view === 'ecosystems' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
          >
            Hệ Sinh Thái
            {view === 'ecosystems' && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-400" />
            )}
          </Link>
        </div>
      </div>

      {/* Client Component: Interactive Grid & Filters (Wrapped in Suspense for useSearchParams) */}
      <Suspense fallback={<div className="h-96 flex items-center justify-center text-white/50">Đang tải dữ liệu...</div>}>
        {view === 'ecosystems' ? (
          <EcosystemGrid initialRegion={region} />
        ) : (
          <SpeciesGrid 
            initialStatus={status} 
            initialGroup={group} 
            initialQuery={q} 
            initialDiet={diet}
            initialHabitat={habitat}
            initialActivityPattern={activityPattern}
          />
        )}
      </Suspense>
    </main>
  );
}
