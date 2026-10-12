"use client";

import { Minus, Expand, Shrink, Trash2, X } from "lucide-react";
import { useAIChatStore } from "../../stores/aiChatStore";
import styles from "../../styles/ai-chat.module.css";
import { chatApi } from "../../services/api";

export function AIChatHeader() {
  const { togglePanel, isExpanded, setIsExpanded, contextType, sessionId, clearConversation } = useAIChatStore();

  const handleClear = () => {
    if (sessionId) void chatApi.deleteSession(sessionId).catch(() => undefined);
    clearConversation();
  };

  return (
    <div className="flex items-center justify-between px-4 h-14 border-b border-[rgba(232,220,200,0.06)] shrink-0">
      {/* Left: Branding & Context */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${styles.thinkOrb}`} />
        <span className="font-mono text-[12px] uppercase tracking-widest text-[#9A8F7E]">
          WildVN AI
        </span>
        
        {contextType !== 'GENERAL' && (
          <div className="hidden sm:flex items-center ml-2 px-2 py-0.5 rounded-sm bg-[#3A5C3A]/20 border border-[#3A5C3A]/50">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#2DD4A8]">
              Context: {contextType.replace('EXPLORE_', '')}
            </span>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1">
        <button 
          onClick={togglePanel}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[#9A8F7E] hover:text-[#E8DCC8] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          aria-label="Thu nhỏ"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden md:flex w-8 h-8 items-center justify-center rounded-md text-[#9A8F7E] hover:text-[#E8DCC8] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
        >
          {isExpanded ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
        </button>
        <button
          onClick={handleClear}
          className="hidden sm:flex w-8 h-8 items-center justify-center rounded-md text-[#9A8F7E] hover:text-[#E8DCC8] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          aria-label="Xóa cuộc trò chuyện"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button 
          onClick={togglePanel}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[#9A8F7E] hover:text-[#E8DCC8] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
