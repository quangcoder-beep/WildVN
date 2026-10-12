package com.example.wildvn.domain.search.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class MlServiceClient {

    private final RestClient restClient;

    public MlServiceClient(@Value("${wildvn.ml-service.url}") String mlServiceUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(mlServiceUrl)
                .build();
    }

    public EmbedResponse embed(String text) {
        EmbedRequest request = new EmbedRequest(text);
        return restClient.post()
                .uri("/ml/embed")
                .body(request)
                .retrieve()
                .body(EmbedResponse.class);
    }

    public RerankResponse rerank(String query, List<String> candidates) {
        RerankRequest request = new RerankRequest(query, candidates);
        return restClient.post()
                .uri("/ml/rerank")
                .body(request)
                .retrieve()
                .body(RerankResponse.class);
    }

    @Data
    public static class EmbedRequest {
        private final String text;
        public EmbedRequest(String text) { this.text = text; }
    }

    @Data
    public static class EmbedResponse {
        private List<Float> vector;
        private int dim;
        private float latency_ms;
    }

    @Data
    @AllArgsConstructor
    public static class RerankRequest {
        private String query;
        private List<String> candidates;
    }

    @Data
    public static class RerankResponse {
        private List<Float> scores;
        private List<Integer> ranked_indices;
        private float latency_ms;
    }
}
