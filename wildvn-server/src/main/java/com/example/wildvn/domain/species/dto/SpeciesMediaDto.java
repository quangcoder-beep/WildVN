package com.example.wildvn.domain.species.dto;

import com.example.wildvn.domain.species.entity.MediaType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class SpeciesMediaDto {
    private UUID id;
    private MediaType type;
    private String url;
    private String caption;
    private boolean primary;
}
