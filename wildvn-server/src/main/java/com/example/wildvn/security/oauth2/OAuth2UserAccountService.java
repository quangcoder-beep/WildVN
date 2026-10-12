package com.example.wildvn.security.oauth2;

import com.example.wildvn.domain.user.entity.AuthProvider;
import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.entity.UserProfile;
import com.example.wildvn.domain.user.entity.UserRole;
import com.example.wildvn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/** Persists a provider identity and returns the application user principal. */
@Service
@RequiredArgsConstructor
public class OAuth2UserAccountService {

    private final UserRepository userRepository;

    @Transactional
    public CustomOAuth2User loadOrCreateUser(String registrationId, Map<String, Object> attributes) {
        AuthProvider authProvider = providerFor(registrationId);
        String email = attribute(attributes, "email");
        String providerId = attribute(attributes, "google".equalsIgnoreCase(registrationId) ? "sub" : "id");

        if (email.isBlank()) {
            throw new OAuth2AuthenticationException("Email not found from OAuth2 provider");
        }

        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .map(existingUser -> validateProvider(existingUser, authProvider))
                .orElseGet(() -> createUser(email, providerId, authProvider, attribute(attributes, "picture")));

        return new CustomOAuth2User(user, attributes);
    }

    private AuthProvider providerFor(String registrationId) {
        if ("google".equalsIgnoreCase(registrationId)) {
            return AuthProvider.GOOGLE;
        }
        if ("facebook".equalsIgnoreCase(registrationId)) {
            return AuthProvider.FACEBOOK;
        }
        throw new OAuth2AuthenticationException(
                "Sorry! Login with " + registrationId + " is not supported yet.");
    }

    private User validateProvider(User user, AuthProvider authProvider) {
        if (user.getAuthProvider() != authProvider) {
            throw new OAuth2AuthenticationException("Looks like you're signed up with "
                    + user.getAuthProvider() + " account. Please use your "
                    + user.getAuthProvider() + " account to login.");
        }
        return user;
    }

    private User createUser(
            String email,
            String providerId,
            AuthProvider authProvider,
            String avatarUrl
    ) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(uniqueUsername(email));
        user.setAuthProvider(authProvider);
        user.setProviderId(providerId);
        user.setRole(UserRole.USER);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setAvatarUrl(avatarUrlFor(authProvider, providerId, avatarUrl));
        user.setProfile(profile);

        return userRepository.save(user);
    }

    private String uniqueUsername(String email) {
        int atIndex = email.indexOf('@');
        String baseUsername = atIndex > 0 ? email.substring(0, atIndex) : email;
        String username = baseUsername;
        int counter = 1;
        while (userRepository.existsByUsernameAndDeletedAtIsNull(username)) {
            username = baseUsername + counter;
            counter++;
        }
        return username;
    }

    private String avatarUrlFor(AuthProvider provider, String providerId, String picture) {
        if (provider == AuthProvider.FACEBOOK && !providerId.isBlank()) {
            return "https://graph.facebook.com/" + providerId + "/picture?type=large";
        }
        return picture;
    }

    private static String attribute(Map<String, Object> attributes, String key) {
        if (attributes == null) {
            return "";
        }
        Object value = attributes.get(key);
        return value == null ? "" : value.toString().trim();
    }
}
