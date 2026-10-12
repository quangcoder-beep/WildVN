package com.example.wildvn.domain.species.controller;

import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.greaterThan;

@SpringBootTest
@AutoConfigureMockMvc
class SpeciesApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SpeciesRepository speciesRepository;

    @Test
    void listsCrawlerSpeciesInTheFrontendContract() throws Exception {
        mockMvc.perform(get("/api/species")
                        .param("page", "1")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.pagination.page").value(1))
                .andExpect(jsonPath("$.pagination.total").value(1176))
                .andExpect(jsonPath("$.data[0].name").isString())
                .andExpect(jsonPath("$.data[0].nameVn").isString())
                .andExpect(jsonPath("$.data[0].taxonomy.rank").isString())
                .andExpect(jsonPath("$.data[0].habitatType").isArray())
                .andExpect(jsonPath("$.data[0].media[0].url").isString());
    }

    @Test
    void returnsTheFullCrawlerRecordWithAPrimaryImage() throws Exception {
        Species species = speciesRepository.findAll(PageRequest.of(0, 1)).getContent().getFirst();

        mockMvc.perform(get("/api/species/{slug}", species.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value(species.getSlug()))
                .andExpect(jsonPath("$.data.nameVn").isString())
                .andExpect(jsonPath("$.data.taxonomy.rank").isString())
                .andExpect(jsonPath("$.data.media[0].url").isString())
                .andExpect(jsonPath("$.data.sourceReferences").isArray());
    }

    @Test
    void rejectsPaginationOutsideThePublicApiLimit() throws Exception {
        mockMvc.perform(get("/api/species").param("limit", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void returnsNotFoundForUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/species/{slug}", "slug-khong-ton-tai"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy loài"));
    }

    @Test
    void filtersByTheRestoredTaxonomyAndStructuredCrawlerFields() throws Exception {
        mockMvc.perform(get("/api/species")
                        .param("group", "Chim")
                        .param("habitat", "TERRESTRIAL")
                        .param("page", "1")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.pagination.total").value(greaterThan(0)))
                .andExpect(jsonPath("$.data[0].habitatType").isArray());
    }

    @Test
    void featuredFallsBackToThumbnailBackedRecordsUntilCuratedFlagsExist() throws Exception {
        mockMvc.perform(get("/api/species/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()", greaterThan(0)))
                .andExpect(jsonPath("$.data[0].thumbnailUrl").isString());
    }
}
