package com.example.wildvn.domain.search.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class SearchEventProducer {

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    public void trackSearch(String userId, String query, String searchType, long resultCount, long latencyMs) {
        if (kafkaTemplate == null) {
            log.debug("[DEV] Kafka not available. Skipping search event.");
            return;
        }
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event_type", "search");
            event.put("user_id", userId != null ? userId : "anonymous");
            event.put("query", query);
            event.put("search_type", searchType);
            event.put("result_count", resultCount);
            event.put("latency_ms", latencyMs);
            event.put("timestamp", System.currentTimeMillis());

            String message = objectMapper.writeValueAsString(event);
            kafkaTemplate.send("search-events", message);
        } catch (Exception e) {
            log.warn("Failed to publish search event to Kafka", e);
        }
    }

    public void trackClick(String userId, String query, String entityId, String entityType, int rank) {
        if (kafkaTemplate == null) {
            log.debug("[DEV] Kafka not available. Skipping click event.");
            return;
        }
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event_type", "click");
            event.put("user_id", userId != null ? userId : "anonymous");
            event.put("query", query);
            event.put("entity_id", entityId);
            event.put("entity_type", entityType);
            event.put("rank", rank);
            event.put("timestamp", System.currentTimeMillis());

            String message = objectMapper.writeValueAsString(event);
            kafkaTemplate.send("click-events", message);
        } catch (Exception e) {
            log.warn("Failed to publish click event to Kafka", e);
        }
    }
}
