package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.entity.UserProfile;
import com.example.wildvn.domain.user.entity.UserRole;
import com.example.wildvn.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ChatApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void ensureIntegrationUser() {
        if (userRepository.findByUsernameAndDeletedAtIsNull("chat-integration-user").isEmpty()) {
            User user = User.builder()
                    .username("chat-integration-user")
                    .email("chat-integration-user@wildvn.test")
                    .role(UserRole.USER)
                    .build();
            UserProfile profile = UserProfile.builder().user(user).headphonePreference(false).build();
            user.setProfile(profile);
            userRepository.save(user);
        }
    }

    @AfterEach
    void removeIntegrationUser() {
        userRepository.findByUsernameAndDeletedAtIsNull("chat-integration-user")
                .ifPresent(user -> userRepository.delete(user));
        userRepository.flush();
    }

    @Test
    void rejectsEmptyChatMessages() throws Exception {
        mockMvc.perform(post("/api/chat")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("messages")));
    }

    @Test
    void answersCountFromTheDatabaseWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/chat")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"Có bao nhiêu loài?\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").value(org.hamcrest.Matchers.containsString("1.176")))
                .andExpect(jsonPath("$.data.provider").value("database"));
    }

    @Test
    void historyEndpointsRequireAnAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/chat/sessions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedChatReturnsAStoredSessionId() throws Exception {
        mockMvc.perform(post("/api/chat")
                        .with(user("chat-integration-user"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"messages\":[{\"role\":\"user\",\"content\":\"Xin chào\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").isString());
    }
}
