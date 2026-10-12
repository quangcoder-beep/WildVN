package com.example.wildvn.domain.academy;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import com.example.wildvn.domain.species.entity.PublishStatus;
import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

class AcademyProgressServiceTest {

    @Test
    void syncStoresUniqueUnlockedSpeciesForTheAuthenticatedUser() {
        AcademyProgressRepository repository = mock(AcademyProgressRepository.class);
        SpeciesRepository speciesRepository = mock(SpeciesRepository.class);
        when(repository.findById("researcher")).thenReturn(Optional.empty());
        when(repository.save(any(AcademyProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(speciesRepository.findAllBySlugInAndPublishStatusAndDeletedAtIsNull(anyCollection(), eq(PublishStatus.PUBLISHED)))
                .thenReturn(List.of(
                        Species.builder().slug("sao-la").publishStatus(PublishStatus.PUBLISHED).build(),
                        Species.builder().slug("vooc-cat-ba").publishStatus(PublishStatus.PUBLISHED).build()
                ));

        AcademyProgressService service = new AcademyProgressService(repository, speciesRepository, new ObjectMapper());

        AcademyProgressDto result = service.sync(
                "researcher",
                List.of("sao-la", "sao-la", " vooc-cat-ba "),
                List.of()
        );

        ArgumentCaptor<AcademyProgress> captor = ArgumentCaptor.forClass(AcademyProgress.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo("researcher");
        assertThat(result.unlockedSpecies()).containsExactly("sao-la", "vooc-cat-ba");
        assertThat(result.completedExpeditions()).isEmpty();
    }

    @Test
    void rejectsUnlockedSpeciesThatAreNotPublishedInTheCatalog() {
        AcademyProgressRepository repository = mock(AcademyProgressRepository.class);
        SpeciesRepository speciesRepository = mock(SpeciesRepository.class);
        when(speciesRepository.findAllBySlugInAndPublishStatusAndDeletedAtIsNull(anyCollection(), eq(PublishStatus.PUBLISHED)))
                .thenReturn(List.of());

        AcademyProgressService service = new AcademyProgressService(repository, speciesRepository, new ObjectMapper());

        assertThatThrownBy(() -> service.sync("researcher", List.of("not-in-db"), List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unlockedSpecies");
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsCompletedExpeditionsUntilAnAcademyCatalogExists() {
        AcademyProgressRepository repository = mock(AcademyProgressRepository.class);
        SpeciesRepository speciesRepository = mock(SpeciesRepository.class);

        AcademyProgressService service = new AcademyProgressService(repository, speciesRepository, new ObjectMapper());

        assertThatThrownBy(() -> service.sync("researcher", List.of(), List.of("mock-expedition")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("completedExpeditions");
        verify(repository, never()).save(any());
    }

    @Test
    void missingProgressReturnsAnEmptySnapshotWithoutCreatingRows() {
        AcademyProgressRepository repository = mock(AcademyProgressRepository.class);
        when(repository.findById("researcher")).thenReturn(Optional.empty());

        AcademyProgressService service = new AcademyProgressService(repository, mock(SpeciesRepository.class), new ObjectMapper());

        AcademyProgressDto result = service.get("researcher");

        assertThat(result.unlockedSpecies()).isEmpty();
        assertThat(result.completedExpeditions()).isEmpty();
        verify(repository, never()).save(any());
    }
}
