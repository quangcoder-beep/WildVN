package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.species.entity.Species;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AnthropicChatProvider implements ChatProvider {

    private final ChatProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public ChatResponse answer(ChatRequest request, ChatContext context) {
        String apiKey = properties.getAnthropicApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Anthropic API key chưa được cấu hình");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", properties.getAnthropicModel());
        payload.put("max_tokens", 1200);
        payload.put("system", systemPrompt(context));
        payload.put("messages", request.messages().stream()
                .filter(message -> message != null && message.content() != null && !message.content().isBlank())
                .map(message -> Map.of(
                        "role", "assistant".equalsIgnoreCase(message.role()) ? "assistant" : "user",
                        "content", message.content()
                ))
                .toList());

        RestClient client = RestClient.builder()
                .baseUrl(properties.getAnthropicEndpoint())
                .build();
        String body = client.post()
                .uri("/v1/messages")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .body(payload)
                .retrieve()
                .body(String.class);

        try {
            JsonNode content = objectMapper.readTree(body).path("content");
            String text = content.isArray() && !content.isEmpty()
                    ? content.get(0).path("text").asText("") : "";
            if (text.isBlank()) throw new IllegalStateException("Anthropic trả về nội dung rỗng");
            return new ChatResponse(text, citations(context), id());
        } catch (Exception exception) {
            throw new IllegalStateException("Không đọc được phản hồi từ Anthropic", exception);
        }
    }

    @Override
    public String id() {
        return "anthropic";
    }

    private String systemPrompt(ChatContext context) {
        StringBuilder prompt = new StringBuilder(
                "Bạn là trợ lý WildVN. Trả lời bằng tiếng Việt, chỉ dựa trên dữ liệu sinh học được cung cấp. "
                        + "Nếu dữ liệu không đủ, nói rõ là chưa có thông tin thay vì bịa đặt.\n\n"
        );
        if (context.focusedSpecies() != null) {
            appendSpecies(prompt, context.focusedSpecies());
        } else {
            for (Species species : context.matches()) appendSpecies(prompt, species);
        }
        return prompt.toString();
    }

    private void appendSpecies(StringBuilder prompt, Species species) {
        prompt.append("Loài: ").append(species.getName()).append("; danh pháp: ")
                .append(species.getScientificName()).append("; slug: ").append(species.getSlug()).append("\n");
        appendIfPresent(prompt, "Nhận diện", species.getIdentificationDesc());
        appendIfPresent(prompt, "Sinh học", species.getBiologyDesc());
        appendIfPresent(prompt, "Bảo tồn", species.getConservationDesc());
    }

    private void appendIfPresent(StringBuilder prompt, String label, String value) {
        if (value != null && !value.isBlank()) prompt.append(label).append(": ").append(value).append("\n");
    }

    private List<ChatCitation> citations(ChatContext context) {
        List<ChatCitation> citations = new ArrayList<>();
        for (Species species : context.matches()) {
            citations.add(new ChatCitation(
                    "species",
                    species.getId() == null ? null : species.getId().toString(),
                    species.getName(),
                    species.getScientificName(),
                    species.getConservationStatus(),
                    species.getSlug()
            ));
        }
        return citations;
    }
}
