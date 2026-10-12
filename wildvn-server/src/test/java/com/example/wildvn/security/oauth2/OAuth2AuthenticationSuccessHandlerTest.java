package com.example.wildvn.security.oauth2;

import com.example.wildvn.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class OAuth2AuthenticationSuccessHandlerTest {

    @Test
    void acceptsUserDetailsPrincipalProducedByOidcMapping() throws Exception {
        String secret = Base64.getEncoder().encodeToString(
                "01234567890123456789012345678901".getBytes());
        OAuth2AuthenticationSuccessHandler handler = new OAuth2AuthenticationSuccessHandler(
                new JwtUtil(secret));
        ReflectionTestUtils.setField(handler, "clientUrl", "http://localhost:3000");

        UserDetails principal = User.withUsername("google-user")
                .password("")
                .roles("USER")
                .build();
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(
                new MockHttpServletRequest(),
                response,
                authentication
        );

        assertThat(response.getStatus()).isEqualTo(302);
        assertThat(response.getRedirectedUrl())
                .isEqualTo("http://localhost:3000/profile?login=success");
        assertThat(response.getHeader("Set-Cookie"))
                .startsWith("wildvn-auth-token=");
    }
}
