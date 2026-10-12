package com.example.wildvn.domain.search.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class SearchEventConsumer {

    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    
    private static final String TRENDING_KEY = "trending:queries:hourly";

    @KafkaListener(topics = "search-events", groupId = "wildvn-search-analytics-group")
    public void consumeSearchEvent(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            String query = event.path("query").asText(null);
            
            if (query != null && query.trim().length() > 1) {
                // Increment score in Redis sorted set
                redisTemplate.opsForZSet().incrementScore(TRENDING_KEY, query.trim().toLowerCase(), 1.0);
            }
        } catch (Exception e) {
            log.error("Error processing search event", e);
        }
    }

    public Set<String> getTrendingQueries(int limit) {
        return redisTemplate.opsForZSet().reverseRange(TRENDING_KEY, 0, limit - 1);
    }
}
