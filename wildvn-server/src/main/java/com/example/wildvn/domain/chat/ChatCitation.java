package com.example.wildvn.domain.chat;

public record ChatCitation(
        String entityType,
        String entityId,
        String name,
        String subtitle,
        String status,
        String slug
) {
}
