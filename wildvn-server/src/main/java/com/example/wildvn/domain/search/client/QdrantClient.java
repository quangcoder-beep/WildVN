package com.example.wildvn.domain.search.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Collections;

@Component
public class QdrantClient {

    private final RestClient restClient;
    private final String collectionName;

    public QdrantClient(@Value("${wildvn.qdrant.url}") String qdrantUrl,
                        @Value("${wildvn.qdrant.collection}") String collectionName) {
        this.restClient = RestClient.builder()
                .baseUrl(qdrantUrl)
                .build();
        this.collectionName = collectionName;
    }

    public SearchResult search(List<Float> vector, int limit, float scoreThreshold) {
        SearchRequest request = SearchRequest.builder()
                .vector(vector)
                .limit(limit)
                .withPayload(true)
                .scoreThreshold(scoreThreshold)
                .build();

        return restClient.post()
                .uri("/collections/{collectionName}/points/search", collectionName)
                .body(request)
                .retrieve()
                .body(SearchResult.class);
    }

    public void upsert(String id, List<Float> vector, Map<String, Object> payload) {
        Point point = Point.builder()
                .id(id)
                .vector(vector)
                .payload(payload)
                .build();
                
        UpsertRequest request = UpsertRequest.builder()
                .points(Collections.singletonList(point))
                .build();
                
        restClient.put()
                .uri("/collections/{collectionName}/points", collectionName)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }
    
    public void delete(String id) {
        DeleteRequest request = DeleteRequest.builder()
                .points(Collections.singletonList(id))
                .build();
                
        restClient.post()
                .uri("/collections/{collectionName}/points/delete", collectionName)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }

    @Data
    @Builder
    public static class SearchRequest {
        private List<Float> vector;
        private int limit;
        @com.fasterxml.jackson.annotation.JsonProperty("with_payload")
        private boolean withPayload;
        @com.fasterxml.jackson.annotation.JsonProperty("score_threshold")
        private float scoreThreshold;
    }

    @Data
    @NoArgsConstructor
    public static class SearchResult {
        private List<PointResult> result;
        private String status;
        private float time;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PointResult {
        private String id;
        private float score;
        private Map<String, Object> payload;
    }
    
    @Data
    @Builder
    public static class Point {
        private String id;
        private List<Float> vector;
        private Map<String, Object> payload;
    }
    
    @Data
    @Builder
    public static class UpsertRequest {
        private List<Point> points;
    }
    
    @Data
    @Builder
    public static class DeleteRequest {
        private List<String> points;
    }
}
