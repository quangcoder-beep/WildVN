package com.example.wildvn.domain.auth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private UserProfileDto user;

    @Data
    @Builder
    public static class UserProfileDto {
        private String id;
        private String username;
        private String email;
        private String avatarUrl;
        private String bio;
        private String conservationIdentity;
        private Boolean headphonePreference;

    }
}
