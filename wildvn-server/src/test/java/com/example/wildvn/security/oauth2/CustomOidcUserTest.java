package com.example.wildvn.security.oauth2;

import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.entity.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUserAuthority;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CustomOidcUserTest {

    @Test
    void usesWildvnUsernameForJwtSubjectWhileRetainingOidcClaims() {
        OidcIdToken idToken = new OidcIdToken(
                "id-token",
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("sub", "provider-sub", "email", "user@example.com")
        );
        OidcUser providerUser = new DefaultOidcUser(
                List.of(new OidcUserAuthority(idToken)),
                idToken
        );

        User user = User.builder()
                .username("wild-user")
                .email("user@example.com")
                .role(UserRole.USER)
                .build();
        CustomOidcUser applicationUser = new CustomOidcUser(
                new CustomOAuth2User(user, providerUser.getAttributes()),
                providerUser
        );

        assertThat(applicationUser).isInstanceOf(UserDetails.class);
        assertThat(applicationUser.getName()).isEqualTo("wild-user");
        assertThat(applicationUser.getIdToken()).isSameAs(idToken);
        assertThat(applicationUser.getClaims()).containsEntry("sub", "provider-sub");
    }
}
