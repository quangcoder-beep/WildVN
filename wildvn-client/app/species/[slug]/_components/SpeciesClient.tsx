"use client";

import Link from "next/link";
import { LenisProvider } from "./LenisProvider";
import { MuseumAnimal } from "./MuseumAnimal";
import { MuseumText } from "./MuseumText";
import { SpecimenTag } from "./SpecimenTag";
import { HorizontalScroller } from "./HorizontalScroller";
import { JourneySlide1, JourneySlide2, JourneySlide3, JourneySlide4 } from "./JourneySlide";
import { ChapterBento } from "./ChapterBento";
import { getImageUrl } from "@/app/_shared/lib/media";
import { getFirstCitationYear } from "./species-detail-utils";

interface SpeciesData {
  id: string;
  slug: string;
  name: string;
  scientificName: string;
  status: string;
  imageSrc: string;
  description: string;
  diet?: string | null;
  habitat?: string | null;
  funFacts?: string | null;
  identificationDesc?: string;
  biologyDesc?: string;
  threatsDesc?: string;
  conservationDesc?: string;
  dietType?: string;
  habitatType?: string[];
  activityPattern?: string;
  conservationStatus?: string;
  taxonomy?: any;
  nameEn?: string | null;
  authorCitation?: string | null;
  synonyms?: string[];
  citesAppendix?: string | null;
  vnDecreeStatus?: string | null;
  vnRedListStatus?: string | null;
  sourceReferences?: any;
  locations?: any[];
  conservationHistory?: any[];
  ecosystemId?: string | null;
  media?: any[];
}

export default function SpeciesClient({ species }: { species: SpeciesData }) {
  return (
    <LenisProvider>
      {/* 3-Layer DOM — Codegrid Architecture */}

      {/* Layer 0: Ambient Background */}
      <div className="species-bg-canvas" aria-hidden="true">
        <div className="species-bg-radial" />
        <div className="species-bg-grain" />
      </div>

      {/* Layer 1: Main Content */}
      <main className="species-layout">

        {/* ═══ CHAPTER 1: THE MUSEUM SPOTLIGHT ═══ */}
        <section className="chapter-museum" id="chapter-museum">
          {/* Spotlight cone */}
          <div className="museum-spotlight" aria-hidden="true" />

          {/* Floor shadow */}
          <div className="museum-floor" aria-hidden="true" />

          {/* The Animal — client leaf for GSAP + mouse tracking */}
          <MuseumAnimal imageSrc={getImageUrl(species.imageSrc)} alt={species.name} />

          {/* Text — client leaf for GSAP mask reveal */}
          <MuseumText
            name={species.name}
            scientificName={species.scientificName}
            status={species.status}
          />

          {/* Specimen Tag — server, top-right corner */}
          <SpecimenTag
            slug={species.slug}
            status={species.conservationStatus || "NE"}
            citationYear={getFirstCitationYear(species.authorCitation)}
          />

          {/* Scroll cue */}
          <div className="museum-scroll-cue" aria-label="Cuộn để tiếp tục">
            <span className="scroll-cue-text">SCROLL</span>
            <div className="scroll-cue-line">
              <div className="scroll-cue-dot" />
            </div>
          </div>
        </section>

        {/* ═══ CHAPTER 2: THE HABITAT JOURNEY ═══ */}
        <HorizontalScroller>
          <JourneySlide1 species={species} />
          <JourneySlide2 species={species} />
          <JourneySlide3 species={species} />
          <JourneySlide4 />
        </HorizontalScroller>

        {/* ═══ CHAPTER 3: THE BENTO TERMINAL ═══ */}
        <ChapterBento species={species} />

      </main>

      {/* Layer 2: Fixed UI Overlay */}
      <div className="species-ui-overlay">
        <Link href="/search" className="back-btn" aria-label="Quay lại tìm kiếm">
          <span className="back-btn__arrow">←</span>
          <span className="back-btn__label">TRA CỨU</span>
        </Link>
      </div>
    </LenisProvider>
  );
}
