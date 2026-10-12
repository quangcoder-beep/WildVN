package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.species.entity.Species;

import java.util.List;

public record ChatContext(Species focusedSpecies, List<Species> matches) {

    public ChatContext {
        matches = matches == null ? List.of() : List.copyOf(matches);
    }

    public static ChatContext empty() {
        return new ChatContext(null, List.of());
    }
}
