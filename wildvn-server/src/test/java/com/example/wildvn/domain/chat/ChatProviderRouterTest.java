package com.example.wildvn.domain.chat;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ChatProviderRouterTest {

    @Test
    void autoModeUsesDatabaseProviderWhenAnthropicKeyIsMissing() {
        DatabaseChatProvider database = mock(DatabaseChatProvider.class);
        AnthropicChatProvider anthropic = mock(AnthropicChatProvider.class);

        ChatProviderRouter router = new ChatProviderRouter(
                new ChatProperties("auto", "", "claude-test", "https://api.anthropic.com", 4000, 20, 5),
                database,
                anthropic
        );

        assertThat(router.select()).isSameAs(database);
    }

    @Test
    void autoModeUsesAnthropicProviderWhenKeyIsPresent() {
        DatabaseChatProvider database = mock(DatabaseChatProvider.class);
        AnthropicChatProvider anthropic = mock(AnthropicChatProvider.class);

        ChatProviderRouter router = new ChatProviderRouter(
                new ChatProperties("auto", "test-key", "claude-test", "https://api.anthropic.com", 4000, 20, 5),
                database,
                anthropic
        );

        assertThat(router.select()).isSameAs(anthropic);
    }

    @Test
    void explicitDatabaseModeNeverCallsAnthropicEvenWhenKeyExists() {
        DatabaseChatProvider database = mock(DatabaseChatProvider.class);
        AnthropicChatProvider anthropic = mock(AnthropicChatProvider.class);

        ChatProviderRouter router = new ChatProviderRouter(
                new ChatProperties("database", "test-key", "claude-test", "https://api.anthropic.com", 4000, 20, 5),
                database,
                anthropic
        );

        assertThat(router.select()).isSameAs(database);
    }
}
