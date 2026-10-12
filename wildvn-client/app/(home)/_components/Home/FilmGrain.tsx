"use client";

/**
 * FilmGrain — Nhiễu hạt phim 35mm phủ lên video nền
 * CSS-only animation, không dùng Framer Motion (hiệu năng tốt hơn)
 */
export function FilmGrain() {
  return (
    <div
      className="absolute inset-0 z-[6] pointer-events-none opacity-[0.06]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
        animation: "grain 0.5s steps(6) infinite",
      }}
    >
      <style>{`
        @keyframes grain {
          0%, 100% { background-position: 0 0; }
          10% { background-position: -5% -10%; }
          20% { background-position: -15% 5%; }
          30% { background-position: 7% -25%; }
          40% { background-position: -5% 25%; }
          50% { background-position: -15% 10%; }
          60% { background-position: 15% 0%; }
          70% { background-position: 0% 15%; }
          80% { background-position: 3% 35%; }
          90% { background-position: -10% 10%; }
        }
      `}</style>
    </div>
  );
}
