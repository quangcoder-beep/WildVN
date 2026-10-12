"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { Message } from "../../stores/aiChatStore";
import { StreamingText } from "./StreamingText";
import { CitationCard } from "./CitationCard";
import { cn } from "../../lib/utils";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRetry?: () => void;
}

export function MessageBubble({ message, isStreaming = false, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const messageVariant = {
    hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
    visible: { 
      opacity: 1, y: 0, filter: "blur(0px)",
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
    }
  };

  if (isUser) {
    return (
      <motion.div
        variants={messageVariant}
        initial="hidden"
        animate="visible"
        className="flex w-full justify-end mb-6"
      >
        <div className="max-w-[80%] bg-[rgba(232,220,200,0.08)] border border-[rgba(232,220,200,0.15)] rounded-[18px_18px_4px_18px] px-4 py-3 text-[#E8DCC8] font-sans text-[14px] leading-relaxed shadow-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  // AI Message
  return (
    <motion.div
      variants={messageVariant}
      initial="hidden"
      animate="visible"
      className="flex flex-col w-full mb-8 group"
    >
      <div className="w-full text-[#9A8F7E] font-sans text-[14px] leading-relaxed markdown-content">
        {isStreaming ? (
          <StreamingText content={message.content} isStreaming={true} />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-[#E8DCC8] mt-6 mb-3" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-[#E8DCC8] mt-5 mb-2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-base font-bold text-[#E8DCC8] mt-4 mb-2" {...props} />,
              p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="pl-1" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-[#E8DCC8]" {...props} />,
              a: ({ node, ...props }) => <a className="text-[#2DD4A8] hover:underline decoration-1 underline-offset-2" {...props} />,
              code: ({ node, inline, ...props }: any) => 
                inline ? (
                  <code className="bg-[#0a0a0a] text-[#2DD4A8] font-mono text-[13px] px-1.5 py-0.5 rounded border border-[rgba(232,220,200,0.1)]" {...props} />
                ) : (
                  <div className="relative group/code mt-2 mb-4">
                    <pre className="bg-[#0a0a0a] border border-[rgba(232,220,200,0.1)] rounded-lg p-4 overflow-x-auto">
                      <code className="font-mono text-[13px] text-[#E8DCC8]" {...props} />
                    </pre>
                    <button className="absolute top-2 right-2 p-1.5 rounded-md bg-[rgba(255,255,255,0.1)] opacity-0 group-hover/code:opacity-100 transition-opacity hover:bg-[rgba(255,255,255,0.2)]" aria-label="Copy code">
                      <Copy className="w-3 h-3 text-[#E8DCC8]" />
                    </button>
                  </div>
                ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="mt-2 space-y-2">
          {message.citations.map((citation) => (
            <CitationCard key={`${citation.entityType}:${citation.slug}`} {...citation} />
          ))}
        </div>
      )}

      {/* Action Buttons - fade in on hover or when complete */}
      {!isStreaming && (
        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ActionButton icon={<Copy className="w-3 h-3" />} label="Copy" onClick={() => void navigator.clipboard?.writeText(message.content)} />
          {onRetry && <ActionButton icon={<RotateCcw className="w-3 h-3" />} label="Thử lại" onClick={onRetry} />}
          <div className="w-px h-3 bg-[rgba(232,220,200,0.1)] mx-1" />
          <ActionButton
            icon={<ThumbsUp className="w-3 h-3" />}
            aria-label="Hữu ích"
            aria-pressed={feedback === "up"}
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
            className={feedback === "up" ? "text-[#2DD4A8]" : undefined}
          />
          <ActionButton
            icon={<ThumbsDown className="w-3 h-3" />}
            aria-label="Không hữu ích"
            aria-pressed={feedback === "down"}
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
            className={feedback === "down" ? "text-[#C8401A]" : undefined}
          />
        </div>
      )}
    </motion.div>
  );
}

function ActionButton({ icon, label, className, ...props }: any) {
  return (
    <button 
      className={cn("flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-widest text-[#9A8F7E] hover:text-[#E8DCC8] hover:bg-[rgba(255,255,255,0.05)] transition-colors", className)}
      {...props}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
