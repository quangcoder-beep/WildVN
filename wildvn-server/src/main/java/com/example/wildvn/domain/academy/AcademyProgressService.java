package com.example.wildvn.domain.academy;

import com.example.wildvn.domain.species.entity.PublishStatus;
import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AcademyProgressService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};

    private final AcademyProgressRepository repository;
    private final SpeciesRepository speciesRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public AcademyProgressDto get(String userId) {
        return repository.findById(userId)
                .map(this::toDto)
                .orElseGet(() -> emptyDto());
    }

    @Transactional
    public AcademyProgressDto sync(String userId, List<String> unlockedSpecies, List<String> completedExpeditions) {
        List<String> normalizedSpecies = validatePublishedSpecies(unlockedSpecies);
        if (completedExpeditions != null && !completedExpeditions.isEmpty()) {
            throw new IllegalArgumentException("completedExpeditions chưa được hỗ trợ vì Academy chưa có catalog");
        }
        AcademyProgress progress = repository.findById(userId)
                .orElseGet(() -> AcademyProgress.builder()
                        .userId(userId)
                        .rpPoints(0)
                        .streakDays(0)
                        .build());
        // Preserve an existing snapshot when older clients omit this field. New
        // expedition IDs are rejected until a database-backed Academy catalog exists.
        List<String> normalizedExpeditions = completedExpeditions == null
                ? readSpecies(progress.getCompletedExpeditions())
                : List.of();
        progress.setUnlockedSpecies(objectMapper.valueToTree(normalizedSpecies));
        progress.setCompletedExpeditions(objectMapper.valueToTree(normalizedExpeditions));
        progress.setLastActiveDate(java.time.OffsetDateTime.now());
        return toDto(repository.save(progress));
    }

    private AcademyProgressDto toDto(AcademyProgress progress) {
        return AcademyProgressDto.builder()
                .rpPoints(progress.getRpPoints() == null ? 0 : progress.getRpPoints())
                .streakDays(progress.getStreakDays() == null ? 0 : progress.getStreakDays())
                .unlockedSpecies(readSpecies(progress.getUnlockedSpecies()))
                .completedExpeditions(readSpecies(progress.getCompletedExpeditions()))
                .build();
    }

    private AcademyProgressDto emptyDto() {
        return AcademyProgressDto.builder()
                .rpPoints(0)
                .streakDays(0)
                .unlockedSpecies(List.of())
                .completedExpeditions(List.of())
                .build();
    }

    private List<String> readSpecies(JsonNode node) {
        if (node == null || !node.isArray()) return List.of();
        return List.copyOf(normalizeSpecies(objectMapper.convertValue(node, STRING_LIST)));
    }

    private List<String> normalizeSpecies(List<String> values) {
        if (values == null || values.isEmpty()) return List.of();
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null) continue;
            String normalized = value.trim();
            if (!normalized.isEmpty()) unique.add(normalized);
            if (unique.size() == 500) break;
        }
        return new ArrayList<>(unique);
    }

    private List<String> validatePublishedSpecies(List<String> values) {
        List<String> normalized = normalizeSpecies(values);
        if (normalized.isEmpty()) return List.of();

        List<Species> published = speciesRepository
                .findAllBySlugInAndPublishStatusAndDeletedAtIsNull(normalized, PublishStatus.PUBLISHED);
        Set<String> publishedSlugs = published.stream()
                .map(Species::getSlug)
                .collect(Collectors.toSet());
        if (publishedSlugs.size() != normalized.size() || !publishedSlugs.containsAll(normalized)) {
            throw new IllegalArgumentException("unlockedSpecies chứa slug không tồn tại hoặc chưa được publish");
        }
        return normalized;
    }
}
