import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";

export default function ExpeditionPage() {
  return (
    <main className="min-h-screen bg-black text-[#E8DCC8] pt-32 px-6 md:px-12">
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-white/5 bg-[#050505] p-10 text-center">
        <Database className="h-8 w-8 text-[#2DD4A8]" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-[#9A8F7E]">// NỘI DUNG ĐANG CHỜ DỮ LIỆU</span>
        <h1 className="font-serif text-3xl font-light text-white">Chưa có cuộc viễn chinh</h1>
        <p className="font-sans text-sm leading-relaxed text-[#9A8F7E]">
          Database hiện chưa có module expedition hoặc chương học tương ứng. Trang này sẽ mở khi nội dung được quản trị trong Spring Boot.
        </p>
        <Link href="/academy" className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-white hover:border-[#2DD4A8]/40 hover:text-[#2DD4A8]">
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Góc Học Tập
        </Link>
      </section>
    </main>
  );
}
