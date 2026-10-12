package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ChatContextResolver {

    private final SpeciesRepository speciesRepository;

    public ChatContext resolve(ChatRequest request) {
        String userText = latestUserMessage(request);
        Species focused = null;
        if (request != null && request.contextEntityId() != null && !request.contextEntityId().isBlank()) {
            focused = speciesRepository.findBySlugAndDeletedAtIsNull(request.contextEntityId().trim()).orElse(null);
        }

        List<Species> matches = new ArrayList<>();
        if (!userText.isBlank()) {
            matches.addAll(speciesRepository.findCatalog(
                    userText.trim(), null, null, null, null, null, null, PageRequest.of(0, 3)
            ).getContent());
        }
        Species resolvedFocused = focused;
        if (resolvedFocused != null && matches.stream().noneMatch(species -> species.getId().equals(resolvedFocused.getId()))) {
            matches.add(0, resolvedFocused);
        }
        return new ChatContext(focused, matches);
    }

    private String latestUserMessage(ChatRequest request) {
        if (request == null || request.messages() == null) return "";
        return request.messages().stream()
                .filter(message -> message != null && "user".equalsIgnoreCase(message.role()))
                .map(ChatMessage::content)
                .filter(content -> content != null)
                .reduce((first, second) -> second)
                .orElse("");
    }
}
