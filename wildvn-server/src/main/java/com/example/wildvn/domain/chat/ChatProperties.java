package com.example.wildvn.domain.chat;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@NoArgsConstructor
@ConfigurationProperties(prefix = "wildvn.chat")
public class ChatProperties {

    private String provider = "auto";
    private String anthropicApiKey = "";
    private String anthropicModel = "claude-3-5-haiku-latest";
    private String anthropicEndpoint = "https://api.anthropic.com";
    private int maxMessageChars = 4000;
    private int maxMessages = 20;
    private int retentionDays = 5;

    public ChatProperties(
            String provider,
            String anthropicApiKey,
            String anthropicModel,
            String anthropicEndpoint,
            int maxMessageChars,
            int maxMessages,
            int retentionDays
    ) {
        this.provider = provider;
        this.anthropicApiKey = anthropicApiKey;
        this.anthropicModel = anthropicModel;
        this.anthropicEndpoint = anthropicEndpoint;
        this.maxMessageChars = maxMessageChars;
        this.maxMessages = maxMessages;
        this.retentionDays = retentionDays;
    }
}
