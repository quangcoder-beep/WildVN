package com.example.wildvn.domain.search.service;

import com.example.wildvn.domain.search.client.MlServiceClient;
import com.example.wildvn.domain.search.client.QdrantClient;
import com.example.wildvn.domain.search.entity.SyncFailure;
import com.example.wildvn.domain.search.repository.SyncFailureRepository;
import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QdrantVectorizerConsumer {

    private final ObjectMapper objectMapper;
    private final SpeciesRepository speciesRepository;
    private final MlServiceClient mlServiceClient;
    private final QdrantClient qdrantClient;
    private final SyncFailureRepository syncFailureRepository;

    @KafkaListener(topics = "entity-events", groupId = "wildvn-qdrant-vectorizer-group")
    public void consume(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);
            String eventType = event.path("event_type").asText();
            String entityType = event.path("entity_type").asText();
            UUID entityId = UUID.fromString(event.path("entity_id").asText());

            if (!"species".equals(entityType)) return;

            if (eventType.endsWith(".deleted")) {
                qdrantClient.delete(entityId.toString());
                log.info("Deleted Qdrant vector for species: {}", entityId);
            } else {
                Species species = speciesRepository.findById(entityId).orElse(null);
                if (species != null) {
                    // Build text to embed
                    String textToEmbed = String.format("%s. %s. Habitat: %s. Tags: %s. Diet: %s.",
                            species.getName(), species.getDescription(), species.getHabitat(),
                            species.getTags(), species.getDiet());

                    // Get embedding
                    List<Float> vector = mlServiceClient.embed(textToEmbed).getVector();

                    // Build payload
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("entity_id", species.getId().toString());
                    payload.put("name", species.getName());
                    payload.put("slug", species.getSlug());
                    payload.put("category", species.getCategory());
                    payload.put("habitat", species.getHabitat());
                    payload.put("thumbnail_url", species.getThumbnailUrl());

                    // Upsert to Qdrant
                    qdrantClient.upsert(species.getId().toString(), vector, payload);
                    log.info("Upserted Qdrant vector for species: {}", entityId);
                }
            }
        } catch (Exception e) {
            log.error("Failed to process Qdrant vectorizing event", e);
            recordFailure(message, "qdrant", e.getMessage());
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
