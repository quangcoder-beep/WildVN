package com.example.wildvn.config;

import com.example.wildvn.domain.chat.ChatProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(ChatProperties.class)
public class ChatConfig {

    @Bean
    public Clock systemClock() {
        return Clock.systemUTC();
    }
}
