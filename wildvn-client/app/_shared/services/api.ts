// Spring Boot is the only API backend. Keep this absolute in the browser so
// requests cannot fall back to Next.js's legacy Prisma route handlers.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081').replace(/\/$/, '');

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export interface SpeciesFacetOption {
  value: string;
  count: number;
}

export interface SpeciesFacets {
  statuses: SpeciesFacetOption[];
  categories: SpeciesFacetOption[];
  diets: SpeciesFacetOption[];
  habitats: SpeciesFacetOption[];
  activityPatterns: SpeciesFacetOption[];
}

export interface ChatCitation {
  entityType: "species" | "expedition";
  entityId?: string | null;
  name: string;
  subtitle?: string | null;
  status?: string | null;
  slug: string;
}

export interface ChatResponse {
  content: string;
  citations?: ChatCitation[];
  provider?: string;
  sessionId?: string | null;
}

export interface ChatSessionSummary {
  id: string;
  updatedAt: string;
  expiresAt: string;
}

export interface AcademyProgress {
  rpPoints: number;
  streakDays: number;
  unlockedSpecies: string[];
  completedExpeditions: string[];
}

export interface AcademyOverview {
  speciesCount: number;
  featuredSpecies: SpeciesSummary[];
  facets?: SpeciesFacets;
}

export interface SpeciesSummary {
  id: string;
  name?: string | null;
  nameVn?: string | null;
  nameEn?: string | null;
  slug: string;
  scientificName?: string | null;
  category?: string | null;
  habitat?: string | null;
  habitatType?: string[] | null;
  dietType?: string | null;
  activityPattern?: string | null;
  thumbnailUrl?: string | null;
  tags?: string | null;
  conservationStatus?: string | null;
  identificationDesc?: string | null;
  biologyDesc?: string | null;
  conservationDesc?: string | null;
  shortDescription?: string | null;
  taxonomy?: Record<string, unknown> | null;
  media?: Array<Record<string, unknown>>;
  images?: string[];
}

export const fetchApi = async <T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const method = (options?.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const csrfToken = isMutation && typeof document !== 'undefined'
    ? document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length)
    : undefined;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };
  if (csrfToken) {
    (headers as Record<string, string>)['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      // BẮT BUỘC: gửi cookie kèm theo mọi request để backend đọc JWT từ HttpOnly Cookie
      credentials: "include",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { message?: string } | null;
      throw new ApiError(
        errorBody?.message || `API error: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export const speciesApi = {
  getSpecies: (page = 1, limit = 20, filters: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return fetchApi<SpeciesSummary[]>(`/api/species?${params.toString()}`);
  },
  
  getFeaturedSpecies: () => fetchApi<SpeciesSummary[]>('/api/species/featured'),
  
  getSpeciesDetail: (slug: string) => fetchApi<any>(`/api/species/${slug}`),
  
  getRelatedSpecies: (slug: string) => fetchApi<any[]>(`/api/species/${slug}/related`),
  getFacets: () => fetchApi<SpeciesFacets>('/api/species/facets'),
};

export const favoritesApi = {
  list: () => fetchApi<any[]>('/api/favorites'),
  getStatus: (speciesId: string) => fetchApi<{ favorited: boolean }>(`/api/favorites/${speciesId}`),
  toggle: (speciesId: string) => fetchApi<{ favorited: boolean }>('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ speciesId }),
  }),
};

export const chatApi = {
  send: (
    messages: Array<{ role: string; content: string }>,
    contextType?: string | null,
    contextEntityId?: string | null,
    sessionId?: string | null,
  ) => fetchApi<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, contextType, contextEntityId, sessionId }),
    }),
  getSessions: () => fetchApi<ChatSessionSummary[]>('/api/chat/sessions'),
  getMessages: (sessionId: string) => fetchApi<Array<{ role: string; content: string }>>(`/api/chat/sessions/${sessionId}/messages`),
  deleteSession: (sessionId: string) => fetchApi<void>(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' }),
  stream: async (
    messages: Array<{ role: string; content: string }>,
    contextType: string | null | undefined,
    contextEntityId: string | null | undefined,
    sessionId: string | null | undefined,
    onToken: (content: string) => void,
    signal?: AbortSignal,
  ): Promise<ChatResponse> => {
    const csrfToken = typeof document !== 'undefined'
      ? document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
      : undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrfToken) headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      credentials: 'include',
      signal,
      body: JSON.stringify({ messages, contextType, contextEntityId, sessionId }),
    });
    if (!response.ok) throw new ApiError(`API error: ${response.status} ${response.statusText}`, response.status);
    if (!response.body) throw new Error('API không hỗ trợ streaming');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let completed: ChatResponse | null = null;
    const consume = (rawEvent: string) => {
      const lines = rawEvent.split(/\r?\n/);
      const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
      const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
      if (!data) return;
      if (eventName === 'token') {
        accumulated += data;
        onToken(accumulated);
      } else if (eventName === 'done') {
        completed = JSON.parse(data) as ChatResponse;
      }
    };

    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      events.forEach(consume);
      if (chunk.done) break;
    }
    if (buffer.trim()) consume(buffer);
    return completed || { content: accumulated, citations: [], provider: 'database' };
  },
};

export const academyApi = {
  getOverview: () => fetchApi<AcademyOverview>('/api/academy/overview'),
  getProgress: () => fetchApi<AcademyProgress>('/api/academy/sync'),
  syncProgress: (unlockedSpecies: string[]) => fetchApi<AcademyProgress>('/api/academy/sync', {
    method: 'POST',
    // Expedition content has no database catalog yet. Omitting the legacy
    // field lets the server preserve old records without accepting new mocks.
    body: JSON.stringify({ payload: { unlockedSpecies } }),
  }),
};

export const ecosystemApi = {
  getEcosystems: (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return fetchApi<any[]>(`/api/ecosystems?${params.toString()}`);
  },
  
  getEcosystemDetail: (slug: string) => fetchApi<any>(`/api/ecosystems/${slug}`),
};
