package com.example.wildvn.security.oauth2;

import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

/** Maps Google's OIDC principal to the same persisted WildVN user as OAuth2. */
@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final OAuth2UserAccountService accountService;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) {
        OidcUser providerUser = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        CustomOAuth2User applicationUser = accountService.loadOrCreateUser(
                registrationId,
                providerUser.getAttributes()
        );
        return new CustomOidcUser(applicationUser, providerUser);
    }
}
