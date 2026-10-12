package com.example.wildvn.domain.search.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
@Slf4j
public class SearchCacheService {

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    public String generateKey(String prefix, Object... params) {
        StringBuilder sb = new StringBuilder();
        for (Object p : params) {
            sb.append(p.toString()).append("|");
        }
        String queryHash = DigestUtils.md5DigestAsHex(sb.toString().getBytes(StandardCharsets.UTF_8));

        String userId = "anon";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            userId = auth.getName();
        }

        return prefix + ":" + queryHash + ":" + userId;
    }

    public <T> T get(String key, TypeReference<T> typeReference) {
        if (redisTemplate == null) return null;
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) return null;
            return objectMapper.readValue(json, typeReference);
        } catch (Exception e) {
            log.debug("[DEV] Redis connection failed or read error. Returning null.");
            return null;
        }
    }

    public void set(String key, Object value, Duration ttl) {
        if (redisTemplate == null) {
            log.debug("[DEV] Redis not available. Skipping cache set for key: {}", key);
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json, ttl);
        } catch (Exception e) {
            log.error("Failed to set cache for key: {}", key, e);
        }
    }
}
