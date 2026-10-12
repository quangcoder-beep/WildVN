package com.example.wildvn.config;

import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.DigestUtils;

import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Component("customKeyGenerator")
public class CustomCacheKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        String queryStr = Arrays.toString(params);
        String queryHash = DigestUtils.md5DigestAsHex(queryStr.getBytes(StandardCharsets.UTF_8));
        
        String userId = "anon";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            // Depending on principal type, extract user ID or email
            userId = auth.getName(); // Fallback to username/email
        }
        
        return "search:" + queryHash + ":" + userId;
    }
}
