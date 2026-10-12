"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAIChatStore, AISessionContext } from "../../stores/aiChatStore";
import { useAuthStore } from "../../stores/authStore";
import { chatApi } from "../../services/api";
import { AIChatFAB } from "./AIChatFAB";
import { AIChatPanel } from "./AIChatPanel";

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setContext, hydrateFromStorage, replaceConversation, clearConversation, clearLocalPersistence, setLocalPersistenceEnabled, hydrated } = useAIChatStore();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const previousAuthState = useRef<boolean | null>(null);
  const isAuthRoute = /^\/(login|register|forgot-password|reset-password)(\/|$)/.test(pathname ?? "");

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Auto-detect context based on route
  useEffect(() => {
    let contextType: AISessionContext = 'GENERAL';
    let contextEntityId: string | undefined = undefined;

    if (pathname === '/') {
      contextType = 'EXPLORE_HOME';
    } else if (pathname === '/species') {
      contextType = 'EXPLORE_CATALOG';
    } else if (pathname?.startsWith('/species/')) {
      contextType = 'EXPLORE_SPECIES';
      contextEntityId = pathname.split('/').pop();
    } else if (pathname?.startsWith('/academy/expeditions')) {
      contextType = 'LEARNING_DASHBOARD'; // simplified
    } else if (pathname?.startsWith('/academy')) {
      contextType = 'LEARNING_DASHBOARD';
    } else if (pathname?.startsWith('/search')) {
      contextType = 'GENERAL';
    }

    setContext(contextType, contextEntityId);
  }, [pathname, setContext]);

  useEffect(() => {
    if (!isLoggedIn || !hydrated) return;
    let cancelled = false;
    void chatApi.getSessions()
      .then(async (response) => {
        const latest = response.data[0];
        if (!latest) return;
        const messages = await chatApi.getMessages(latest.id);
        if (cancelled) return;
        replaceConversation(messages.data.map((message, index) => ({
          id: `${latest.id}:${index}`,
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        })), latest.id);
        clearLocalPersistence();
      })
      .catch(() => {
        // Keep the local five-day snapshot when the optional history request fails.
      });
    return () => { cancelled = true; };
  }, [clearLocalPersistence, hydrated, isLoggedIn, replaceConversation]);

  useEffect(() => {
    setLocalPersistenceEnabled(!isLoggedIn);
    if (previousAuthState.current === true && !isLoggedIn) clearConversation();
    previousAuthState.current = isLoggedIn;
  }, [clearConversation, isLoggedIn, setLocalPersistenceEnabled]);

  return (
    <>
      {children}
      {!isAuthRoute && <AIChatFAB />}
      {!isAuthRoute && <AIChatPanel />}
    </>
  );
}
