package com.example.wildvn.domain.favorite;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FavoriteStatusDto {
    boolean favorited;
}
