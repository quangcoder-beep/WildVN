import { Suspense } from "react";
import { FieldNotesClient } from "./_components/FieldNotesClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sổ Tay Thực Địa",
  description: "Bộ sưu tập và hồ sơ sinh vật học đa dạng sinh học Việt Nam của bạn.",
};

export default function FieldNotesPage() {
  return (
    <main className="min-h-screen bg-black text-[#E8DCC8] pt-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-8">
      <Suspense fallback={<FieldNotesSkeleton />}>
        <FieldNotesClient />
      </Suspense>
    </main>
  );
}

function FieldNotesSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-12 animate-pulse">
      <div className="h-6 w-32 bg-zinc-900 rounded-lg" />
      <div className="h-12 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      <div className="h-10 w-full bg-zinc-900 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 bg-zinc-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
