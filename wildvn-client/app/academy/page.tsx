import { Suspense } from "react";
import { AcademyClient } from "./_components/AcademyClient";

export default async function AcademyPage() {
  return (
    <main className="min-h-screen bg-black text-[#E8DCC8] pt-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Academy Hero Section */}
      <section className="flex flex-col gap-4 max-w-3xl pt-12">
        <span className="font-mono text-xs text-[#2DD4A8] tracking-[0.2em] uppercase">
          // HỌC VIỆN HOANG DÃ VIỆT NAM
        </span>
        <h1 className="font-serif text-5xl md:text-7xl font-light italic leading-tight text-white animate-fade-in">
          Góc Học Tập
        </h1>
        <p className="font-sans text-sm md:text-base text-[#9A8F7E] leading-relaxed max-w-xl">
          Không gian tra cứu và ôn tập dựa trên catalog loài đã được chuẩn hóa trong cơ sở dữ liệu WildVN.
          Các module học tập chuyên sâu sẽ mở khi nội dung được quản trị trong hệ thống.
        </p>
      </section>

      {/* Academy Container using Streaming */}
      <Suspense fallback={<AcademySkeleton />}>
        <AcademyClient />
      </Suspense>
    </main>
  );
}

function AcademySkeleton() {
  return (
    <div className="flex flex-col gap-6 py-24 animate-pulse">
      <div className="h-10 w-48 bg-zinc-900 rounded-lg" />
      <div className="h-24 w-full bg-zinc-900 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[400px]">
        <div className="md:col-span-2 md:row-span-2 bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="md:col-span-2 bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="md:col-span-1 bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="md:col-span-1 bg-zinc-900 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
