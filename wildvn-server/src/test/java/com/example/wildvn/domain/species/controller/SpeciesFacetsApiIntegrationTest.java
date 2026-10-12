package com.example.wildvn.domain.species.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SpeciesFacetsApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsOnlyFilterOptionsThatHaveSpeciesData() throws Exception {
        mockMvc.perform(get("/api/species/facets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.statuses").isArray())
                .andExpect(jsonPath("$.data.statuses.length()", greaterThan(0)))
                .andExpect(jsonPath("$.data.statuses[0].value").value("NE"))
                .andExpect(jsonPath("$.data.statuses[0].count").value(greaterThan(0)))
                .andExpect(jsonPath("$.data.categories").isArray())
                .andExpect(jsonPath("$.data.categories.length()", greaterThan(0)))
                .andExpect(jsonPath("$.data.categories[*].value", hasItem("Thú")))
                .andExpect(jsonPath("$.data.diets").isArray())
                .andExpect(jsonPath("$.data.diets[*].value", hasItem("CARNIVORE")))
                .andExpect(jsonPath("$.data.habitats").isArray())
                .andExpect(jsonPath("$.data.habitats[*].value", hasItem("TERRESTRIAL")))
                .andExpect(jsonPath("$.data.activityPatterns").isArray())
                .andExpect(jsonPath("$.data.activityPatterns[*].value", hasItem("NOCTURNAL")));
    }
}
