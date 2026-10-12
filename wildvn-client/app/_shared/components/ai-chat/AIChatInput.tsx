"use client";

import { useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Mic } from "lucide-react";
import styles from "../../styles/ai-chat.module.css";
import { cn } from "../../lib/utils";

interface AIChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function AIChatInput({ input, setInput, onSubmit, isLoading }: AIChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  const handleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as Window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      };
    }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput(`${input}${input ? " " : ""}${transcript}`);
    };
    recognition.onerror = () => undefined;
    recognition.start();
  };

  useEffect(() => {
    // Focus input when mounted (if on desktop)
    if (window.innerWidth > 768) {
      inputRef.current?.focus();
    }
  }, []);

  return (
    <div className="px-4 py-4 shrink-0 bg-transparent">
      <form 
        ref={formRef}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className={cn(
          "relative flex items-end gap-2 p-1.5 rounded-[16px]",
          styles.inputGlass
        )}
      >
        {/* Optional Voice Button */}
        <button
          type="button"
          onClick={handleVoiceInput}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-[#9A8F7E] hover:text-[#E8DCC8] hover:bg-[rgba(255,255,255,0.05)] transition-colors mb-0.5"
          aria-label="Nhập bằng giọng nói"
        >
          <Mic className="w-4 h-4" />
        </button>

        <TextareaAutosize
          ref={inputRef}
          tabIndex={0}
          rows={1}
          maxRows={5}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi về sinh vật, bảo tồn, hoặc bất kỳ điều gì..."
          className="flex-1 max-h-[120px] py-2.5 px-1 bg-transparent text-[14px] text-[#E8DCC8] placeholder:text-[#9A8F7E]/50 focus:outline-none resize-none font-sans"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            "w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 mb-0.5",
            input.trim() && !isLoading
              ? "bg-[#C8401A] text-white shadow-[0_0_15px_rgba(200,64,26,0.3)] hover:bg-[#d64a22]"
              : "bg-[rgba(255,255,255,0.05)] text-[#9A8F7E] opacity-50 cursor-not-allowed"
          )}
          aria-label="Gửi tin nhắn"
        >
          <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </form>
      
      <div className="text-center mt-2">
        <span className="text-[10px] font-mono text-[#9A8F7E]/50 tracking-widest uppercase">
          AI có thể mắc lỗi. Vui lòng kiểm tra lại thông tin quan trọng.
        </span>
      </div>
    </div>
  );
}
