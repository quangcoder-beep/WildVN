import { Suspense } from "react";
import { ArenaClient } from "./_components/ArenaClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đấu Trường Trắc Nghiệm",
  description: "Trải nghiệm bài trắc nghiệm nhận diện động thực vật hoang dã Việt Nam và luyện thẻ nhớ.",
};

export default function ArenaPage() {
  return (
    <main className="min-h-screen bg-black text-[#E8DCC8] pt-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-8">
      <Suspense fallback={<ArenaSkeleton />}>
        <ArenaClient />
      </Suspense>
    </main>
  );
}

function ArenaSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-12 animate-pulse">
      <div className="h-6 w-32 bg-zinc-900 rounded-lg" />
      <div className="h-12 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
        <div className="bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="bg-zinc-900 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
