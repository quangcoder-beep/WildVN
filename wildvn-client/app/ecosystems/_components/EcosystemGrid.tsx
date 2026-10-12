"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Loader2 } from "lucide-react";
import { EcosystemCard } from "./EcosystemCard";
import { ecosystemApi } from "@/app/_shared/services/api";

export function EcosystemGrid({
  initialRegion,
}: {
  initialRegion: string;
}) {
  const [ecosystems, setEcosystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState(initialRegion);

  const regions = ["ALL", "Đồng Bằng Sông Cửu Long", "Miền Trung", "Tây Nguyên", "Tây Bắc", "Vịnh Bắc Bộ"];

  useEffect(() => {
    let isMounted = true;
    
    const fetchEcosystems = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters: any = {};
        if (region !== "ALL") filters.region = region;
        
        const res = await ecosystemApi.getEcosystems(1, 20, filters);
        if (res.success && isMounted) {
          setEcosystems(res.data);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchEcosystems();
    return () => { isMounted = false; };
  }, [region]);

  return (
    <div className="w-full flex-1 flex flex-col items-center px-6 md:px-12 lg:px-24">
      
      {/* Filter Row */}
      <div className="w-full max-w-7xl mb-12 relative z-10 flex flex-wrap gap-2">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
              region === r 
                ? "bg-white text-black border-white" 
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {r === "ALL" ? "Tất cả vùng miền" : r}
          </button>
        ))}
      </div>

      {/* Grid List */}
      <div className="w-full max-w-7xl relative z-10 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-12 h-12 text-white/30 animate-spin mb-4" />
            <p className="text-white/50">Đang tải dữ liệu từ máy chủ...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShieldAlert className="w-12 h-12 text-red-500/50 mb-4" />
            <p className="text-white/80 mb-4">Lỗi tải dữ liệu. Vui lòng thử lại.</p>
            <button onClick={() => setRegion(region)} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20">Thử lại</button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {ecosystems.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {ecosystems.map((eco, index) => (
                  <EcosystemCard key={eco.id} ecosystem={eco} index={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                  <ShieldAlert className="w-8 h-8 text-white/30" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Không có kết quả</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-6 text-sm">
                  Không tìm thấy hệ sinh thái nào cho vùng này.
                </p>
                <button
                  onClick={() => setRegion("ALL")}
                  className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
