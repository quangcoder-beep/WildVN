package com.example.wildvn.domain.academy;

import lombok.Builder;

import java.util.List;

@Builder
public record AcademyProgressDto(
        int rpPoints,
        int streakDays,
        List<String> unlockedSpecies,
        List<String> completedExpeditions
) {
}
