package com.example.wildvn.security.oauth2;

import com.example.wildvn.domain.user.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Collection;
import java.util.Map;

/** OIDC provider data backed by the persisted WildVN user identity. */
public final class CustomOidcUser implements OidcUser, UserDetails {

    private final CustomOAuth2User applicationUser;
    private final OidcUser providerUser;

    public CustomOidcUser(CustomOAuth2User applicationUser, OidcUser providerUser) {
        this.applicationUser = applicationUser;
        this.providerUser = providerUser;
    }

    public User getUser() {
        return applicationUser.getUser();
    }

    @Override
    public Map<String, Object> getClaims() {
        return providerUser.getClaims();
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return providerUser.getUserInfo();
    }

    @Override
    public OidcIdToken getIdToken() {
        return providerUser.getIdToken();
    }

    @Override
    public Map<String, Object> getAttributes() {
        return providerUser.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return applicationUser.getAuthorities();
    }

    @Override
    public String getName() {
        return applicationUser.getUsername();
    }

    @Override
    public String getPassword() {
        return applicationUser.getPassword();
    }

    @Override
    public String getUsername() {
        return applicationUser.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return applicationUser.isAccountNonExpired();
    }

    @Override
    public boolean isAccountNonLocked() {
        return applicationUser.isAccountNonLocked();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return applicationUser.isCredentialsNonExpired();
    }

    @Override
    public boolean isEnabled() {
        return applicationUser.isEnabled();
    }
}
