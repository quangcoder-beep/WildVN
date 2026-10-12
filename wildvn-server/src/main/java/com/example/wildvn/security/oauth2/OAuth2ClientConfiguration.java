package com.example.wildvn.security.oauth2;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;

import java.util.ArrayList;
import java.util.List;

/**
 * Maps credentials from the project .env file to Spring Security OAuth2
 * registrations. The bean is created only when at least one provider is fully
 * configured, so OAuth remains optional for local/demo deployments.
 */
@Configuration(proxyBeanMethods = false)
@Conditional(OAuth2ClientConfiguration.OAuth2CredentialsCondition.class)
public class OAuth2ClientConfiguration {

    private static final String GOOGLE_CLIENT_ID =
            "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID";
    private static final String GOOGLE_CLIENT_SECRET =
            "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET";
    private static final String FACEBOOK_CLIENT_ID =
            "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_ID";
    private static final String FACEBOOK_CLIENT_SECRET =
            "SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_FACEBOOK_CLIENT_SECRET";

    @Bean
    @ConditionalOnMissingBean(ClientRegistrationRepository.class)
    ClientRegistrationRepository clientRegistrationRepository(Environment environment) {
        List<ClientRegistration> registrations = new ArrayList<>();

        addRegistrationIfConfigured(
                registrations,
                environment.getProperty(GOOGLE_CLIENT_ID),
                environment.getProperty(GOOGLE_CLIENT_SECRET),
                CommonOAuth2Provider.GOOGLE,
                "google",
                new String[]{"openid", "profile", "email"}
        );
        addRegistrationIfConfigured(
                registrations,
                environment.getProperty(FACEBOOK_CLIENT_ID),
                environment.getProperty(FACEBOOK_CLIENT_SECRET),
                CommonOAuth2Provider.FACEBOOK,
                "facebook",
                new String[]{"email", "public_profile"}
        );

        return new InMemoryClientRegistrationRepository(registrations);
    }

    private static void addRegistrationIfConfigured(
            List<ClientRegistration> registrations,
            String clientId,
            String clientSecret,
            CommonOAuth2Provider provider,
            String registrationId,
            String[] scopes
    ) {
        if (!hasText(clientId) || !hasText(clientSecret)) {
            return;
        }

        registrations.add(provider.getBuilder(registrationId)
                .clientId(clientId.trim())
                .clientSecret(clientSecret.trim())
                .scope(scopes)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .build());
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    static final class OAuth2CredentialsCondition
            extends org.springframework.boot.autoconfigure.condition.SpringBootCondition {

        @Override
        public org.springframework.boot.autoconfigure.condition.ConditionOutcome getMatchOutcome(
                org.springframework.context.annotation.ConditionContext context,
                org.springframework.core.type.AnnotatedTypeMetadata metadata
        ) {
            Environment environment = context.getEnvironment();
            boolean googleConfigured = hasPair(
                    environment.getProperty(GOOGLE_CLIENT_ID),
                    environment.getProperty(GOOGLE_CLIENT_SECRET)
            );
            boolean facebookConfigured = hasPair(
                    environment.getProperty(FACEBOOK_CLIENT_ID),
                    environment.getProperty(FACEBOOK_CLIENT_SECRET)
            );

            if (googleConfigured || facebookConfigured) {
                return org.springframework.boot.autoconfigure.condition.ConditionOutcome
                        .match("at least one OAuth2 provider credential pair is configured");
            }
            return org.springframework.boot.autoconfigure.condition.ConditionOutcome
                    .noMatch("no complete OAuth2 provider credential pair is configured");
        }

        private static boolean hasPair(String clientId, String clientSecret) {
            return hasText(clientId) && hasText(clientSecret);
        }
    }
}
