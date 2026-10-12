package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatProviderRouter providerRouter;
    private final ChatContextResolver contextResolver;
    private final ChatHistoryService historyService;
    private final UserRepository userRepository;
    private final ChatProperties properties;

    @Transactional
    public ChatResponse answer(ChatRequest request, String username) {
        ChatRequestValidator.validate(request, properties);
        ChatContext context = contextResolver.resolve(request);
        ChatProvider selected = providerRouter.select();
        ChatResponse response;
        try {
            response = selected.answer(request, context);
        } catch (RuntimeException providerFailure) {
            if (selected instanceof DatabaseChatProvider) throw providerFailure;
            response = providerRouter.databaseProvider().answer(request, context)
                    .withProvider("database-fallback");
        }

        Optional<User> user = findUser(username);
        if (user.isPresent()) {
            String userContent = latestUserMessage(request);
            UUID sessionId = historyService.append(user.get(), request.sessionId(), userContent, response.content());
            response = response.withSessionId(sessionId);
        }
        return response;
    }

    private Optional<User> findUser(String username) {
        if (username == null || username.isBlank() || "anonymousUser".equalsIgnoreCase(username)) {
            return Optional.empty();
        }
        return userRepository.findByUsernameAndDeletedAtIsNull(username);
    }

    private String latestUserMessage(ChatRequest request) {
        return request.messages().stream()
                .filter(message -> "user".equalsIgnoreCase(message.role()))
                .map(ChatMessage::content)
                .reduce((first, second) -> second)
                .orElse("");
    }
}
