package com.example.wildvn.domain.chat;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ChatRequest(
        List<ChatMessage> messages,
        String contextType,
        String contextEntityId,
        UUID sessionId
) {
    public ChatRequest(List<ChatMessage> messages, String contextType, String contextEntityId) {
        this(messages, contextType, contextEntityId, null);
    }
}
