package com.example.wildvn.domain.species.service;

import com.example.wildvn.domain.media.MediaUrlService;
import com.example.wildvn.domain.species.entity.PublishStatus;
import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SpeciesQueryServiceTest {

    @Test
    void summaryExposesTheDbBackedLearningDescriptions() {
        Species species = Species.builder()
                .name("Sao la")
                .slug("sao-la")
                .scientificName("Pseudoryx nghetinhensis")
                .conservationStatus("CR")
                .publishStatus(PublishStatus.PUBLISHED)
                .identificationDesc("Dấu hiệu nhận biết từ dữ liệu crawler")
                .biologyDesc("Thông tin sinh học từ dữ liệu crawler")
                .conservationDesc("Thông tin bảo tồn từ dữ liệu crawler")
                .build();
        SpeciesRepository repository = mock(SpeciesRepository.class);
        SpeciesQueryService service = new SpeciesQueryService(repository, mock(MediaUrlService.class));

        var summary = service.toSummary(species);

        assertThat(summary.getIdentificationDesc()).isEqualTo("Dấu hiệu nhận biết từ dữ liệu crawler");
        assertThat(summary.getBiologyDesc()).isEqualTo("Thông tin sinh học từ dữ liệu crawler");
        assertThat(summary.getConservationDesc()).isEqualTo("Thông tin bảo tồn từ dữ liệu crawler");
        assertThat(summary.getShortDescription()).isEqualTo("Dấu hiệu nhận biết từ dữ liệu crawler");
    }
}
