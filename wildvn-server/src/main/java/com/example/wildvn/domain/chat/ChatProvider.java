package com.example.wildvn.domain.chat;

public interface ChatProvider {

    ChatResponse answer(ChatRequest request, ChatContext context);

    String id();
}
