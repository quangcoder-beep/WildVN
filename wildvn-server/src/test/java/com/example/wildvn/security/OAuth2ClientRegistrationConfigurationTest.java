package com.example.wildvn.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=test-google-id",
        "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=test-google-secret",
        "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_ID=test-facebook-id",
        "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_SECRET=test-facebook-secret"
})
class OAuth2ClientRegistrationConfigurationTest {

    @Autowired
    private ClientRegistrationRepository clientRegistrationRepository;

    @Test
    void mapsDotEnvOAuthCredentialsToGoogleAndFacebookRegistrations() {
        var google = clientRegistrationRepository.findByRegistrationId("google");
        var facebook = clientRegistrationRepository.findByRegistrationId("facebook");

        assertThat(google).isNotNull();
        assertThat(google.getClientId()).isEqualTo("test-google-id");
        assertThat(google.getProviderDetails().getAuthorizationUri())
                .isEqualTo("https://accounts.google.com/o/oauth2/v2/auth");

        assertThat(facebook).isNotNull();
        assertThat(facebook.getClientId()).isEqualTo("test-facebook-id");
        assertThat(facebook.getProviderDetails().getAuthorizationUri())
                .startsWith("https://www.facebook.com/")
                .endsWith("/dialog/oauth");
    }
}
