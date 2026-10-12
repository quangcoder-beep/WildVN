package com.example.wildvn.domain.favorite;

import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final UserFavoriteRepository favoriteRepository;
    private final SpeciesRepository speciesRepository;

    @Transactional
    public boolean toggle(String userId, UUID speciesId) {
        UserFavoriteId favoriteId = new UserFavoriteId(userId, speciesId);
        return favoriteRepository.findById(favoriteId)
                .map(existing -> {
                    favoriteRepository.delete(existing);
                    return false;
                })
                .orElseGet(() -> {
                    Species species = speciesRepository.findById(speciesId)
                            .filter(item -> item.getDeletedAt() == null)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy loài"));
                    favoriteRepository.save(UserFavorite.builder()
                            .id(favoriteId)
                            .species(species)
                            .build());
                    return true;
                });
    }

    @Transactional(readOnly = true)
    public boolean isFavorited(String userId, UUID speciesId) {
        return favoriteRepository.existsByUserIdAndSpeciesId(userId, speciesId);
    }

    @Transactional(readOnly = true)
    public List<UserFavorite> list(String userId) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
