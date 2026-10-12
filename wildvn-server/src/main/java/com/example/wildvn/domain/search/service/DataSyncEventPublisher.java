package com.example.wildvn.domain.search.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@Slf4j
public class DataSyncEventPublisher {

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    public void publishEvent(String eventType, UUID entityId, String entityType) {
        if (kafkaTemplate == null) {
            log.warn("[DEV] Kafka not available. Skipping sync event: {} for {} {}", eventType, entityType, entityId);
            return;
        }
        try {
            String message = String.format(
                "{\"event_type\":\"%s\",\"entity_id\":\"%s\",\"entity_type\":\"%s\",\"timestamp\":\"%s\"}",
                eventType, entityId.toString(), entityType,
                DateTimeFormatter.ISO_INSTANT.format(Instant.now())
            );
            kafkaTemplate.send("entity-events", message);
            log.info("Published sync event: {}", message);
        } catch (Exception e) {
            log.error("Failed to publish sync event for {}", entityId, e);
        }
    }
}
