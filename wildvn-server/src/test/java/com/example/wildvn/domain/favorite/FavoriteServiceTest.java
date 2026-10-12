package com.example.wildvn.domain.favorite;

import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FavoriteServiceTest {

    @Mock
    private UserFavoriteRepository favoriteRepository;

    @Mock
    private SpeciesRepository speciesRepository;

    @Test
    void toggleCreatesFavoriteForExistingSpecies() {
        UUID speciesId = UUID.randomUUID();
        when(favoriteRepository.findById(any())).thenReturn(Optional.empty());
        when(speciesRepository.findById(speciesId)).thenReturn(Optional.of(Species.builder().id(speciesId).build()));

        FavoriteService service = new FavoriteService(favoriteRepository, speciesRepository);

        boolean favorited = service.toggle("researcher", speciesId);

        assertThat(favorited).isTrue();
        ArgumentCaptor<UserFavorite> captor = ArgumentCaptor.forClass(UserFavorite.class);
        verify(favoriteRepository).save(captor.capture());
        assertThat(captor.getValue().getId().getUserId()).isEqualTo("researcher");
        assertThat(captor.getValue().getId().getSpeciesId()).isEqualTo(speciesId);
    }

    @Test
    void toggleDeletesExistingFavorite() {
        UUID speciesId = UUID.randomUUID();
        UserFavorite existing = UserFavorite.builder()
                .id(new UserFavoriteId("researcher", speciesId))
                .build();
        when(favoriteRepository.findById(any())).thenReturn(Optional.of(existing));

        FavoriteService service = new FavoriteService(favoriteRepository, speciesRepository);

        boolean favorited = service.toggle("researcher", speciesId);

        assertThat(favorited).isFalse();
        verify(favoriteRepository).delete(existing);
        verifyNoInteractions(speciesRepository);
    }
}
