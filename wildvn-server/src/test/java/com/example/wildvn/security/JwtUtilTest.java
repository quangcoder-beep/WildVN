package com.example.wildvn.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    @Test
    void refusesToSignWhenSecretIsMissing() {
        JwtUtil jwtUtil = new JwtUtil("");

        assertThatThrownBy(() -> jwtUtil.generateToken(User.withUsername("researcher")
                        .password("unused")
                        .roles("USER")
                        .build()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }
}
