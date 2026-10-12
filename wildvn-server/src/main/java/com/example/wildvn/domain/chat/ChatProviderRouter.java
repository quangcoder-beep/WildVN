package com.example.wildvn.domain.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatProviderRouter {

    private final ChatProperties properties;
    private final DatabaseChatProvider databaseProvider;
    private final AnthropicChatProvider anthropicProvider;

    public ChatProvider select() {
        String configured = properties.getProvider() == null
                ? "auto" : properties.getProvider().trim().toLowerCase();
        boolean hasApiKey = properties.getAnthropicApiKey() != null
                && !properties.getAnthropicApiKey().isBlank();

        if ("anthropic".equals(configured) && hasApiKey) return anthropicProvider;
        if ("auto".equals(configured) && hasApiKey) return anthropicProvider;
        return databaseProvider;
    }

    DatabaseChatProvider databaseProvider() {
        return databaseProvider;
    }
}
