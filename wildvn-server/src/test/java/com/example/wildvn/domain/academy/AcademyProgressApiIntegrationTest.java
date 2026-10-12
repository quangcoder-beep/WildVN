package com.example.wildvn.domain.academy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AcademyProgressApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void progressEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/academy/sync"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void academyOverviewIsPublicAndUsesTheDatabaseCatalog() throws Exception {
        mockMvc.perform(get("/api/academy/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.speciesCount").value(1176))
                .andExpect(jsonPath("$.data.facets.statuses").isArray())
                .andExpect(jsonPath("$.data.featuredSpecies").isArray());
    }

    @Test
    void authenticatedUserReceivesAProgressSnapshot() throws Exception {
        mockMvc.perform(get("/api/academy/sync").with(user("academy-test-user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.unlockedSpecies").isArray());
    }

    @Test
    void syncValidatesThePayloadShape() throws Exception {
                mockMvc.perform(post("/api/academy/sync")
                        .with(user("academy-test-user"))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void syncRejectsExpeditionIdsUntilTheAcademyCatalogExists() throws Exception {
        mockMvc.perform(post("/api/academy/sync")
                        .with(user("academy-test-user"))
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "payload": {
                                    "unlockedSpecies": [],
                                    "completedExpeditions": ["mock-expedition"]
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isString());
    }
}
