import { create } from "zustand";
import type { ChatCitation } from "../services/api";

export type AISessionContext =
  | "GENERAL"
  | "EXPLORE_HOME"
  | "EXPLORE_CATALOG"
  | "EXPLORE_SPECIES"
  | "EXPLORE_MAP"
  | "LEARNING_DASHBOARD"
  | "LEARNING_QUIZ"
  | "LEARNING_FIELD_NOTES";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
}

const STORAGE_KEY = "wildvn-ai-chat";
export const CHAT_RETENTION_MS = 5 * 24 * 60 * 60 * 1000;

interface PersistedChat {
  sessionId: string | null;
  messages: Message[];
  expiresAt: number;
}

interface AIChatState {
  isOpen: boolean;
  isExpanded: boolean;
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  contextType: AISessionContext;
  contextEntityId: string | null;
  unreadCount: number;
  hydrated: boolean;
  localPersistenceEnabled: boolean;

  togglePanel: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsExpanded: (isExpanded: boolean) => void;
  setContext: (type: AISessionContext, entityId?: string) => void;
  addMessage: (message: Message) => void;
  removeLastMessage: () => void;
  replaceConversation: (messages: Message[], sessionId?: string | null) => void;
  updateLastMessage: (content: string, isStreaming: boolean, citations?: ChatCitation[]) => void;
  clearConversation: () => void;
  setSessionId: (sessionId: string | null) => void;
  hydrateFromStorage: () => void;
  setLocalPersistenceEnabled: (enabled: boolean) => void;
  clearLocalPersistence: () => void;
  setUnreadCount: (count: number) => void;
}

function persistConversation(messages: Message[], sessionId: string | null, enabled = true) {
  if (typeof window === "undefined" || !enabled || messages.length === 0) return;
  const value: PersistedChat = {
    messages,
    sessionId,
    expiresAt: Date.now() + CHAT_RETENTION_MS,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function clearPersistedConversation() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

export const useAIChatStore = create<AIChatState>((set) => ({
  isOpen: false,
  isExpanded: false,
  sessionId: null,
  messages: [],
  isStreaming: false,
  contextType: "GENERAL",
  contextEntityId: null,
  unreadCount: 0,
  hydrated: false,
  localPersistenceEnabled: true,

  togglePanel: () => set((state) => ({
    isOpen: !state.isOpen,
    unreadCount: state.isOpen ? state.unreadCount : 0,
  })),
  setIsOpen: (isOpen) => set({ isOpen, unreadCount: isOpen ? 0 : 0 }),
  setIsExpanded: (isExpanded) => set({ isExpanded }),
  setContext: (type, entityId = undefined) => set({
    contextType: type,
    contextEntityId: entityId ?? null,
  }),
  addMessage: (message) => set((state) => {
    const messages = [...state.messages, message];
    persistConversation(messages, state.sessionId, state.localPersistenceEnabled);
    return {
      messages,
      unreadCount: !state.isOpen && message.role === "assistant"
        ? state.unreadCount + 1 : state.unreadCount,
    };
  }),
  removeLastMessage: () => set((state) => {
    const messages = state.messages.slice(0, -1);
    if (messages.length === 0) clearPersistedConversation();
    else persistConversation(messages, state.sessionId, state.localPersistenceEnabled);
    return { messages };
  }),
  replaceConversation: (messages, sessionId = null) => set((state) => {
    persistConversation(messages, sessionId, state.localPersistenceEnabled);
    return { messages: [...messages], sessionId, unreadCount: 0 };
  }),
  updateLastMessage: (content, isStreaming, citations) => set((state) => {
    const last = state.messages[state.messages.length - 1];
    if (!last || last.role !== "assistant") return { isStreaming };
    const messages = state.messages.map((message, index) =>
      index === state.messages.length - 1
        ? { ...message, content, ...(citations ? { citations } : {}) }
        : message,
    );
    persistConversation(messages, state.sessionId, state.localPersistenceEnabled);
    return { messages, isStreaming };
  }),
  clearConversation: () => {
    clearPersistedConversation();
    set({ messages: [], sessionId: null, unreadCount: 0 });
  },
  setSessionId: (sessionId) => set((state) => {
    persistConversation(state.messages, sessionId, state.localPersistenceEnabled);
    return { sessionId };
  }),
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as PersistedChat;
      if (!parsed.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed.messages)) {
        clearPersistedConversation();
        set({ hydrated: true });
        return;
      }
      set({ messages: parsed.messages, sessionId: parsed.sessionId ?? null, hydrated: true });
    } catch {
      clearPersistedConversation();
      set({ hydrated: true });
    }
  },
  setLocalPersistenceEnabled: (enabled) => set({ localPersistenceEnabled: enabled }),
  clearLocalPersistence: () => clearPersistedConversation(),
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
}));
