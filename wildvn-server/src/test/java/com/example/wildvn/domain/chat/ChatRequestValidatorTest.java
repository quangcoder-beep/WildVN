package com.example.wildvn.domain.chat;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatRequestValidatorTest {

    private final ChatProperties properties = new ChatProperties(
            "database", "", "claude-test", "https://api.anthropic.com", 4000, 2, 5
    );

    @Test
    void rejectsEmptyMessageList() {
        assertThatThrownBy(() -> ChatRequestValidator.validate(new ChatRequest(List.of(), null, null), properties))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("messages");
    }

    @Test
    void rejectsMessagesAboveConfiguredLimit() {
        ChatRequest request = new ChatRequest(List.of(
                new ChatMessage("user", "one"),
                new ChatMessage("user", "two"),
                new ChatMessage("user", "three")
        ), null, null);

        assertThatThrownBy(() -> ChatRequestValidator.validate(request, properties))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("tối đa");
    }

    @Test
    void rejectsUnsupportedRolesAndOversizedContent() {
        ChatRequest request = new ChatRequest(List.of(
                new ChatMessage("system", "one")
        ), null, null);

        assertThatThrownBy(() -> ChatRequestValidator.validate(request, properties))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("role");
    }
}
