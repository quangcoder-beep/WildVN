package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class DatabaseChatProvider implements ChatProvider {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private final SpeciesRepository speciesRepository;

    @Override
    public ChatResponse answer(ChatRequest request, ChatContext context) {
        String userText = latestUserMessage(request);
        String normalized = userText.toLowerCase(VIETNAMESE);

        if (normalized.startsWith("xin chào") || normalized.startsWith("xin chao")
                || normalized.startsWith("hello") || normalized.startsWith("hi ")
                || normalized.equals("hi") || normalized.startsWith("alo ") || normalized.equals("alo")) {
            return new ChatResponse("Xin chào! Tôi là trợ lý tra cứu WildVN. Bạn muốn tìm hiểu loài nào?", List.of(), id());
        }

        if (normalized.matches(".*(bao nhiêu|bao nhieu|số lượng|so luong|tổng số|tong so|count|total).*")) {
            long total = speciesRepository.countByDeletedAtIsNull();
            return new ChatResponse("WildVN hiện đang lưu trữ **" + formatNumber(total) + " loài** trong cơ sở dữ liệu.", List.of(), id());
        }

        Species species = context.focusedSpecies();
        if (species == null && !context.matches().isEmpty()) species = context.matches().get(0);
        if (species == null && !userText.isBlank()) {
            List<Species> matches = speciesRepository.findCatalog(
                    userText.trim(), null, null, null, null, null, null, PageRequest.of(0, 3)
            ).getContent();
            if (!matches.isEmpty()) species = matches.get(0);
        }

        if (species != null) {
            String name = displayName(species);
            String status = species.getConservationStatus() == null || species.getConservationStatus().isBlank()
                    ? "chưa cập nhật" : species.getConservationStatus();
            StringBuilder content = new StringBuilder("**").append(name).append("** (*")
                    .append(species.getScientificName()).append(")\\n\\n")
                    .append("Tình trạng bảo tồn: **").append(status).append("**");
            if (species.getIdentificationDesc() != null && !species.getIdentificationDesc().isBlank()) {
                content.append("\\n\\nNhận diện: ").append(species.getIdentificationDesc());
            }
            content.append("\\n\\n🔗 [Xem chi tiết](/species/").append(species.getSlug()).append(")");
            return new ChatResponse(content.toString(), List.of(toCitation(species)), id());
        }

        return new ChatResponse("Tôi chưa tìm thấy thông tin phù hợp. Hãy thử tên loài, danh pháp khoa học hoặc hỏi số lượng loài.", List.of(), id());
    }

    @Override
    public String id() {
        return "database";
    }

    private ChatCitation toCitation(Species species) {
        return new ChatCitation(
                "species",
                species.getId() == null ? null : species.getId().toString(),
                displayName(species),
                species.getScientificName(),
                species.getConservationStatus(),
                species.getSlug()
        );
    }

    private String latestUserMessage(ChatRequest request) {
        if (request == null || request.messages() == null) return "";
        return request.messages().stream()
                .filter(message -> message != null && "user".equalsIgnoreCase(message.role()))
                .map(ChatMessage::content)
                .filter(content -> content != null)
                .reduce((first, second) -> second)
                .orElse("");
    }

    private String formatNumber(long value) {
        return NumberFormat.getIntegerInstance(VIETNAMESE).format(value);
    }

    private String displayName(Species species) {
        return species.getName() == null || species.getName().isBlank()
                ? species.getScientificName() : species.getName();
    }
}
