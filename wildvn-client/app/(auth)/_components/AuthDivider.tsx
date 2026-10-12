"use client";

export function AuthDivider() {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
        hoặc
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
