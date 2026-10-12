package com.example.wildvn.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

@SpringBootTest
@AutoConfigureMockMvc
class OAuth2AuthorizationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void authorizationStartEndpointIsNotRejectedByJsonAuthenticationEntryPoint() throws Exception {
        mockMvc.perform(get("/oauth2/authorization/google"))
                .andExpect(result -> assertNotEquals(
                        HttpStatus.UNAUTHORIZED.value(),
                        result.getResponse().getStatus()
                ));
    }

    @Test
    void authorizationCallbackEndpointIsNotRejectedByJsonAuthenticationEntryPoint() throws Exception {
        mockMvc.perform(get("/login/oauth2/code/google"))
                .andExpect(result -> assertNotEquals(
                        HttpStatus.UNAUTHORIZED.value(),
                        result.getResponse().getStatus()
                ));
    }
}
