"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useAIChatStore } from "../../stores/aiChatStore";
import { AIChatHeader } from "./AIChatHeader";
import { AIChatMessages } from "./AIChatMessages";
import { AIChatInput } from "./AIChatInput";
import styles from "../../styles/ai-chat.module.css";
import { cn } from "../../lib/utils";
import { chatApi } from "../../services/api";

export function AIChatPanel() {
  const { isOpen, isExpanded, contextType, contextEntityId, sessionId, addMessage, removeLastMessage, updateLastMessage, setSessionId } = useAIChatStore();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (submittedInput = input) => {
    const content = submittedInput.trim();
    if (!content || isLoading) return;

    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content };
    const requestMessages = [...useAIChatStore.getState().messages, userMsg]
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }));
    addMessage(userMsg);
    setInput("");
    setIsLoading(true);
    addMessage({ id: crypto.randomUUID(), role: "assistant", content: "" });
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    useAIChatStore.setState({ isStreaming: true });

    try {
      const response = await chatApi.stream(
        requestMessages,
        contextType,
        contextEntityId,
        sessionId,
        (partialContent) => updateLastMessage(partialContent, true),
        abortRef.current.signal,
      );
      updateLastMessage(response.content, false, response.citations);
      if (response.sessionId) setSessionId(response.sessionId);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        removeLastMessage();
        return;
      }
      console.error(error);
      updateLastMessage("Xin lỗi, đã có lỗi xảy ra khi kết nối. Vui lòng thử lại sau.", false);
    } finally {
      setIsLoading(false);
      useAIChatStore.setState({ isStreaming: false });
    }
  };

  const handlePromptSelect = (text: string) => {
    void handleSubmit(text);
  };

  const handleCustomSubmit = () => {
    void handleSubmit();
  };

  // Keyboard shortcut to close (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        useAIChatStore.setState({ isOpen: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const panelVariant = {
    closed: { 
      y: 100, 
      opacity: 0, 
      scale: 0.95,
      pointerEvents: "none" as any
    },
    open: { 
      y: 0, 
      opacity: 1, 
      scale: 1,
      pointerEvents: "auto" as any,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        mass: 0.8
      } as any
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => useAIChatStore.setState({ isOpen: false })}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm md:hidden"
          />

          <motion.div
            variants={panelVariant}
            initial="closed"
            animate="open"
            exit="closed"
            className={cn(
              "fixed z-[100] flex flex-col overflow-hidden will-change-transform origin-bottom-right",
              styles.panel,
              // Desktop positioning
              "md:bottom-24 md:right-6 md:rounded-[24px] md:shadow-2xl",
              isExpanded ? "md:w-[800px] md:h-[85vh]" : "md:w-[420px] md:h-[70vh] md:max-h-[700px]",
              // Mobile positioning
              "bottom-0 right-0 left-0 rounded-t-[24px] h-[85vh] md:left-auto"
            )}
            style={{
              transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1), height 0.4s cubic-bezier(0.22, 1, 0.36, 1)"
            }}
          >
            <AIChatHeader />
            
            <AIChatMessages onSelectPrompt={handlePromptSelect} onRetry={(text) => void handleSubmit(text)} />

            <AIChatInput 
              input={input} 
              setInput={setInput} 
              onSubmit={handleCustomSubmit} 
              isLoading={isLoading} 
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
