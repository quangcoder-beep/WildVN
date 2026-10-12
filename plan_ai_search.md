# STEP 1 — CONFIRM UNDERSTANDING

I have fully read and understood the SUPPLEMENT PLAN for the AI-powered search, recommendation, and ML system.

**Key Understandings:**
1.  **Existing Context:** This is an *addition* to the existing WildVN Spring Boot/Next.js/PostgreSQL stack. No existing tables or endpoints will be modified.
2.  **New Infrastructure:** Introduction of Elasticsearch 8.x (keyword), Qdrant/Weaviate (vector), Redis (caching), Kafka (async events), and a new separate FastAPI ML Service (`bge-small-en-v1.5` embeddings, `ms-marco-MiniLM-L-6-v2` reranking).
3.  **Immutable Rules:** All embedding generation is async, Kafka is used for events/indexing, cache keys follow a specific convention (`search:{query_hash}:{user_id_or_anon}`), and the ML service is strictly internal.
4.  **Phases:**
    *   **Phase 1 (F1-F3):** Foundation (Keyword search via Elasticsearch, Autocomplete, Redis caching).
    *   **Phase 2 (A1-A3):** AI Layer (Semantic search via Qdrant, Hybrid search via RRF + Reranker, AI Query Suggestion).
    *   **Phase 3 (P1-P3):** Personalization (Content-based, User behavior-based, Personalized search ranking).
    *   **Phase 4 (T1-T2):** Analytics & Trending (Search event tracking via Kafka, Redis sorted sets for trending).
5.  **API Contracts:** Unified API response format (`{ success, data, pagination, meta }` / `{ success, error_code, message }`). Internal FastAPI contract is also understood.
6.  **New Tables:** `search_events`, `search_clicks`, `user_affinities`, `search_suggestions_popularity`.

I have no questions at this time. The scope is clear.

---

# STEP 2 — PRINT FULL IMPLEMENTATION PLAN TABLE

| No. | Phase | Module | Endpoint(s) | Depends on | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| 1 | F1 | Traditional Full-text Search | `GET /api/search` | - | Elasticsearch setup (BM25, fuzzy, synonyms). Search across species, lessons, ecosystems. |
| 2 | F2 | Search Suggestion / Autocomplete | `GET /api/search/suggest` | F1 | Prefix tree / ES completion suggester + popularity ranking. |
| 3 | F3 | Redis Caching Layer | (Applied to F1, F2) | F1, F2 | Caching results, suggestions. TTL management. |
| 4 | A1 | Semantic Search | `GET /api/search/semantic` | ML Svc, Qdrant | FastAPI embed endpoint integration. Qdrant ANN search (cos sim >= 0.72). |
| 5 | A2 | Hybrid Search | `GET /api/search/hybrid` | F1, A1, ML Svc | Combine F1 & A1 via RRF. Call FastAPI `/ml/rerank` for final scoring. |
| 6 | A3 | AI Query Suggestion | `GET /api/search/ai-suggest` | F3, ML Svc | Predict completions based on history, co-search, and trending. |
| 7 | P1 | Content-based Recommendation | `GET /api/recommend/similar/:entityId` | ES/Qdrant | Recommend based on tags, habitat, family, food chain. |
| 8 | P2 | User Behavior Recommendation | `GET /api/recommend/for-you` | Auth, Analytics | Collaborative filtering or ALS based on click/view history. |
| 9 | P3 | Personalized Search Ranking | `GET /api/search/hybrid` (modified) | A2, Auth, P2 | Inject user affinity boost factors into hybrid search results. |
| 10 | T1 | Search Analytics | (Async Tracking via Kafka) | - | Track query, clicks, latency. Save to `search_events`, `search_clicks`. |
| 11 | T2 | Trending System | `GET /api/search/trending` | Redis | Compute using `ZINCRBY trending:queries:hourly`. Return top N. |

---

# STEP 3 — WAIT
Waiting for "OK" to begin.
