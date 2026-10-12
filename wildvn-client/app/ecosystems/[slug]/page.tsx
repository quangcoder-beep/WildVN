import type { Metadata } from "next";
import { Suspense } from "react";
import EcosystemDetailClient from "./_components/EcosystemDetailClient";
import { ecosystemApi } from "@/app/_shared/services/api";
import { getImageUrl } from "@/app/_shared/lib/media";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await ecosystemApi.getEcosystemDetail(slug);
    if (!res.success) throw new Error();
    const ecosystem = res.data;
    return {
      title: `${ecosystem.name} | WildVN Bản Đồ Sinh Học`,
      description: ecosystem.description,
      openGraph: {
        title: ecosystem.name,
        description: ecosystem.description,
        images: (() => {
          const image = getImageUrl(ecosystem.thumbnailUrl);
          return image ? [{ url: image }] : [];
        })(),
      },
    };
  } catch (e) {
    return { title: "Không tìm thấy hệ sinh thái" };
  }
}

export default async function EcosystemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  try {
    const res = await ecosystemApi.getEcosystemDetail(slug);
    if (!res.success) throw new Error();
    const ecosystem = res.data;

    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Đang tải...</div>}>
        <EcosystemDetailClient ecosystem={ecosystem} />
      </Suspense>
    );
  } catch (e) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-red-500">
        HỆ SINH THÁI KHÔNG TỒN TẠI — {slug}
      </div>
    );
  }
}
