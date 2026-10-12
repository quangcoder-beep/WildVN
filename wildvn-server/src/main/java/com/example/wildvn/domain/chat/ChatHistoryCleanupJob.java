package com.example.wildvn.domain.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatHistoryCleanupJob {

    private final ChatHistoryService historyService;

    @Scheduled(cron = "${wildvn.chat.cleanup-cron:0 0 * * * *}")
    public void removeExpiredHistory() {
        historyService.deleteExpired();
    }
}
