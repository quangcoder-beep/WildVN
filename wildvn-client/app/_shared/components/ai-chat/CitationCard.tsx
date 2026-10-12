"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface CitationProps {
  entityType: "species" | "expedition";
  entityId?: string | null;
  name: string;
  subtitle?: string;
  status?: string;
  slug: string;
}

export function CitationCard({ entityType, name, subtitle, status, slug }: CitationProps) {
  const isSpecies = entityType === "species";
  const href = isSpecies ? `/species/${slug}` : `/academy/expeditions/${slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="my-3 inline-block w-full max-w-xs"
    >
      <Link
        href={href}
        className="group flex flex-col gap-2 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(232,220,200,0.06)] hover:border-[rgba(232,220,200,0.2)] hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#E8DCC8] truncate group-hover:text-white transition-colors">
              {name}
            </h4>
            {subtitle && (
              <p className="text-xs text-[#9A8F7E] italic font-serif truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#2DD4A8] group-hover:text-black transition-colors">
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {isSpecies && status && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C8401A]" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-[#C8401A]">
              {status}
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
