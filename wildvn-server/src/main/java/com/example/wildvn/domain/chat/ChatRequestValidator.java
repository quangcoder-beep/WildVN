package com.example.wildvn.domain.chat;

import java.util.List;

public final class ChatRequestValidator {

    private ChatRequestValidator() {
    }

    public static void validate(ChatRequest request, ChatProperties properties) {
        if (request == null || request.messages() == null || request.messages().isEmpty()) {
            throw new IllegalArgumentException("messages không được để trống");
        }

        int maxMessages = Math.max(1, properties.getMaxMessages());
        if (request.messages().size() > maxMessages) {
            throw new IllegalArgumentException("messages chỉ được phép tối đa " + maxMessages + " phần tử");
        }

        int maxChars = Math.max(1, properties.getMaxMessageChars());
        int totalChars = 0;
        boolean hasUserMessage = false;
        for (ChatMessage message : request.messages()) {
            if (message == null || message.role() == null || message.content() == null) {
                throw new IllegalArgumentException("message không hợp lệ");
            }
            if (!"user".equalsIgnoreCase(message.role()) && !"assistant".equalsIgnoreCase(message.role())) {
                throw new IllegalArgumentException("role chỉ được là user hoặc assistant");
            }
            if (message.content().isBlank()) {
                throw new IllegalArgumentException("content không được để trống");
            }
            if (message.content().length() > maxChars) {
                throw new IllegalArgumentException("content chỉ được phép tối đa " + maxChars + " ký tự");
            }
            totalChars += message.content().length();
            hasUserMessage |= "user".equalsIgnoreCase(message.role());
        }
        if (!hasUserMessage) {
            throw new IllegalArgumentException("messages phải có ít nhất một user message");
        }
        if (totalChars > maxChars * maxMessages) {
            throw new IllegalArgumentException("tổng nội dung chat vượt quá giới hạn");
        }
    }
}
