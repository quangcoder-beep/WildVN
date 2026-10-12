package com.example.wildvn.domain.search.controller;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.domain.search.entity.SyncFailure;
import com.example.wildvn.domain.search.repository.SyncFailureRepository;
import com.example.wildvn.domain.search.service.DataSyncEventPublisher;
import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/sync")
@RequiredArgsConstructor
public class AdminSyncController {

    private final SyncFailureRepository syncFailureRepository;
    private final SpeciesRepository speciesRepository;
    private final DataSyncEventPublisher eventPublisher;

    @GetMapping("/failures")
    public ApiResponse<List<SyncFailure>> getFailures() {
        return ApiResponse.success(syncFailureRepository.findByResolvedFalse());
    }

    @PostMapping("/reindex")
    public ApiResponse<String> reindex(@RequestBody ReindexRequest request) {
        // Here we can publish events for all species to trigger re-indexing
        List<Species> allSpecies = speciesRepository.findAll();
        for (Species species : allSpecies) {
            eventPublisher.publishEvent("species.updated", species.getId(), "species");
        }
        return ApiResponse.success("Reindex triggered for " + allSpecies.size() + " entities. Target: " + request.getTarget());
    }

    @Data
    public static class ReindexRequest {
        private String target; // "elasticsearch" | "qdrant" | "all"
    }
}
