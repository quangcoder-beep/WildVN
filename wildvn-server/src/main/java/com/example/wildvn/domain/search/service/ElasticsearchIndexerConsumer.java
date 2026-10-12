package com.example.wildvn.domain.search.service;

import com.example.wildvn.domain.search.document.SpeciesDocument;
import com.example.wildvn.domain.search.entity.SyncFailure;
import com.example.wildvn.domain.search.repository.SpeciesSearchRepository;
import com.example.wildvn.domain.search.repository.SyncFailureRepository;
import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ElasticsearchIndexerConsumer {

    private final ObjectMapper objectMapper;
    private final SpeciesRepository speciesRepository;
    private final SpeciesSearchRepository speciesSearchRepository;
    private final SyncFailureRepository syncFailureRepository;

    @KafkaListener(topics = "entity-events", groupId = "wildvn-es-indexer-group")
    public void consume(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            String eventType = event.path("event_type").asText();
            String entityType = event.path("entity_type").asText();
            UUID entityId = UUID.fromString(event.path("entity_id").asText());

            if (!"species".equals(entityType)) return;

            if (eventType.endsWith(".deleted")) {
                speciesSearchRepository.deleteById(entityId.toString());
                log.info("Deleted ES document for species: {}", entityId);
            } else {
                Species species = speciesRepository.findById(entityId).orElse(null);
                if (species != null) {
                    SpeciesDocument doc = SpeciesDocument.builder()
                            .id(species.getId().toString())
                            .name(species.getName())
                            .nameVn(species.getName()) // Simplify for now
                            .description(species.getDescription())
                            .habitat(species.getHabitat())
                            .category(species.getCategory())
                            .tags(species.getTags() != null ? species.getTags().split(",") : new String[0])
                            .build();
                    speciesSearchRepository.save(doc);
                    log.info("Upserted ES document for species: {}", entityId);
                }
            }
        } catch (Exception e) {
            log.error("Failed to process ES indexing event", e);
            recordFailure(message, "elasticsearch", e.getMessage());
        }
    }

    private void recordFailure(String message, String target, String error) {
        try {
            JsonNode event = objectMapper.readTree(message);
            SyncFailure failure = SyncFailure.builder()
                    .entityId(UUID.fromString(event.path("entity_id").asText()))
                    .entityType(event.path("entity_type").asText())
                    .target(target)
                    .errorMessage(error)
                    .retryCount(0)
                    .resolved(false)
                    .build();
            syncFailureRepository.save(failure);
        } catch (Exception e) {
            log.error("Failed to record sync failure", e);
        }
    }
}
