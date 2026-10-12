package com.example.wildvn.domain.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultDto {
    private List<SearchItemDto> results;
    private String searchType; // "keyword", "semantic", "hybrid"
    private long totalHits;
}
