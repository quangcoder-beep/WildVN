package com.example.wildvn.domain.chat;

import java.util.List;
import java.util.UUID;

public record ChatResponse(
        String content,
        List<ChatCitation> citations,
        String provider,
        UUID sessionId
) {
    public ChatResponse {
        citations = citations == null ? List.of() : List.copyOf(citations);
    }

    public ChatResponse(String content) {
        this(content, List.of(), "database", null);
    }

    public ChatResponse(String content, List<ChatCitation> citations, String provider) {
        this(content, citations, provider, null);
    }

    public ChatResponse withSessionId(UUID id) {
        return new ChatResponse(content, citations, provider, id);
    }

    public ChatResponse withProvider(String providerId) {
        return new ChatResponse(content, citations, providerId, sessionId);
    }
}
