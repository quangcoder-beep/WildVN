"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { AIThinkingIndicator } from "./AIThinkingIndicator";
import { AIChatEmpty } from "./AIChatEmpty";
import { useAIChatStore } from "../../stores/aiChatStore";
import { ArrowDown } from "lucide-react";

interface AIChatMessagesProps {
  onSelectPrompt: (text: string) => void;
  onRetry?: (text: string) => void;
}

export function AIChatMessages({ onSelectPrompt, onRetry }: AIChatMessagesProps) {
  const { messages, isStreaming } = useAIChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Auto scroll when streaming or new message appears
  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom();
    }
  }, [messages, isStreaming, showScrollBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollBottom(!isAtBottom);
  };

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide scroll-smooth"
      >
        {messages.length === 0 ? (
          <AIChatEmpty onSelectPrompt={onSelectPrompt} />
        ) : (
          <div className="flex flex-col">
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              const msgIsStreaming = isLast && msg.role === "assistant" && isStreaming;
              
              return (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isStreaming={msgIsStreaming} 
                  onRetry={onRetry && idx > 0 && messages[idx - 1]?.role === "user"
                    ? () => onRetry(messages[idx - 1].content)
                    : undefined}
                />
              );
            })}

            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <AIThinkingIndicator />
            )}

            <div ref={lastMessageRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[rgba(3,3,3,0.8)] backdrop-blur border border-[rgba(232,220,200,0.1)] flex items-center justify-center shadow-lg text-[#E8DCC8] hover:bg-[rgba(255,255,255,0.1)] transition-all z-10 animate-in fade-in slide-in-from-bottom-2"
          aria-label="Cuộn xuống dưới cùng"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
