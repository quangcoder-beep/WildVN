package com.example.wildvn.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CachedResult<T> {
    private T data;
    private boolean cacheHit;
}
