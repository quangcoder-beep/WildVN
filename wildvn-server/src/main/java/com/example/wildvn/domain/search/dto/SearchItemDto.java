package com.example.wildvn.domain.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchItemDto {
    private String id;
    private String title;
    private String description;
    private String type; // "species", "lesson", "ecosystem"
    private Float score;
    private Map<String, Object> metadata;
}
