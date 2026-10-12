import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import SpeciesClient from "./_components/SpeciesClient";
import "./species.css";


import { speciesApi } from "@/app/_shared/services/api";
import { getImageUrl } from "@/app/_shared/lib/media";

// ─── SEO METADATA (rules.md: generateMetadata dynamic) ───
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await speciesApi.getSpeciesDetail(slug);
    if (!res.success) throw new Error();
    const species = res.data;
    return {
      title: `${species.nameVn || species.scientificName} — ${species.scientificName} | WildVN Sách Đỏ`,
      description: species.identificationDesc || species.biologyDesc || '',
      openGraph: {
        title: species.nameVn || species.scientificName,
        description: species.identificationDesc || species.biologyDesc || '',
        images: (() => {
          const image = getImageUrl(species.thumbnailUrl || species.media?.[0]?.url);
          return image ? [{ url: image }] : [];
        })(),
      },
    };
  } catch (e) {
    return { title: "Không tìm thấy loài" };
  }
}

export default async function SpeciesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const res = await speciesApi.getSpeciesDetail(slug);
    if (!res.success) throw new Error();
    const species = res.data;
    
    // Map API data to what SpeciesClient expects
    const clientData = {
      ...species,
      name: species.nameVn || species.scientificName,
      description: species.identificationDesc || species.biologyDesc || species.description || species.funFacts || '',
      status: species.conservationStatus,
      imageSrc: species.thumbnailUrl || (species.media?.[0]?.url) || "",
      media: species.media
    };

    return (
      <Suspense fallback={<div className="loading-screen">LOADING...</div>}>
        <SpeciesClient species={clientData} />
      </Suspense>
    );
  } catch {
    notFound();
  }
}
