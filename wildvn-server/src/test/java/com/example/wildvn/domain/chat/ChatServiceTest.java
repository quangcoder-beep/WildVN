package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.species.repository.SpeciesRepository;
import com.example.wildvn.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private SpeciesRepository speciesRepository;

    @Test
    void answersSpeciesCountFromDatabase() {
        when(speciesRepository.countByDeletedAtIsNull()).thenReturn(1176L);

        ChatProperties properties = new ChatProperties(
                "database", "", "claude-test", "https://api.anthropic.com", 4000, 20, 5
        );
        DatabaseChatProvider databaseProvider = new DatabaseChatProvider(speciesRepository);
        ChatProviderRouter router = mock(ChatProviderRouter.class);
        when(router.select()).thenReturn(databaseProvider);
        ChatContextResolver contextResolver = mock(ChatContextResolver.class);
        when(contextResolver.resolve(org.mockito.ArgumentMatchers.any())).thenReturn(ChatContext.empty());
        ChatHistoryService historyService = mock(ChatHistoryService.class);
        UserRepository userRepository = mock(UserRepository.class);
        ChatService service = new ChatService(router, contextResolver, historyService, userRepository, properties);

        String answer = service.answer(new ChatRequest(
                java.util.List.of(new ChatMessage("user", "Có bao nhiêu loài?")), null, null
        ), null).content();

        assertThat(answer).contains("1.176");
    }
}
