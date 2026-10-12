"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MapPin, CloudSun, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { SpecimenCard } from "@/app/species/_components/SpecimenCard";
import styles from "@/app/_shared/styles/glass.module.css";
import { FilmGrain } from "@/app/(home)/_components/Home/FilmGrain";
import { getImageUrl } from "@/app/_shared/lib/media";

export default function EcosystemDetailClient({ ecosystem }: { ecosystem: any }) {
  return (
    <main className="min-h-screen bg-[#050505] text-white pt-24 pb-20 relative overflow-hidden">
      <FilmGrain />

      <div className="absolute top-0 left-0 w-full h-[60vh] z-0 overflow-hidden">
        <img src={getImageUrl(ecosystem.thumbnailUrl)} alt={ecosystem.name} className="w-full h-full object-cover opacity-40 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/10 via-[#050505]/60 to-[#050505] z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-20">
        <Link href="/ecosystems" className="inline-flex items-center text-white/50 hover:text-white transition-colors mb-12 group text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          QUAY LẠI BẢN ĐỒ
        </Link>

        <header className="mb-16 max-w-4xl">
          <span className="text-emerald-400/80 tracking-[0.3em] uppercase text-sm font-bold mb-4 block">
            // HỆ SINH THÁI
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            {ecosystem.name}
          </h1>
          
          <div className="flex flex-wrap gap-6 mb-8">
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl ${styles.macGlass} bg-white/5 border border-white/10`}>
              <MapPin className="w-6 h-6 text-emerald-500" />
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">Khu vực</div>
                <div className="text-sm font-medium">{ecosystem.region}</div>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl ${styles.macGlass} bg-white/5 border border-white/10`}>
              <CloudSun className="w-6 h-6 text-amber-500" />
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">Khí hậu</div>
                <div className="text-sm font-medium">{ecosystem.climate}</div>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl ${styles.macGlass} bg-white/5 border border-white/10`}>
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">Mối đe dọa</div>
                <div className="text-sm font-medium truncate max-w-[200px]" title={ecosystem.threats}>{ecosystem.threats}</div>
              </div>
            </div>
          </div>

          <div className="text-lg md:text-xl text-white/70 font-light leading-relaxed max-w-3xl">
            {ecosystem.description}
          </div>
        </header>

        {/* Species in this Ecosystem */}
        <section className="mt-24">
          <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Hệ Động Thực Vật</h2>
              <p className="text-white/50">Phát hiện {ecosystem.speciesCount} loài đang sinh sống tại đây.</p>
            </div>
          </div>
          
          {ecosystem.species && ecosystem.species.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ecosystem.species.map((sp: any, i: number) => (
                <SpecimenCard key={sp.id} species={sp} index={i} />
              ))}
            </motion.div>
          ) : (
            <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-white/10">
              <p className="text-white/40">Chưa có dữ liệu về các loài trong hệ sinh thái này.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
