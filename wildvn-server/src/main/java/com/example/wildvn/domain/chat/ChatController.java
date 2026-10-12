package com.example.wildvn.domain.chat;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final ChatHistoryService historyService;
    private final UserRepository userRepository;
    private final ChatRateLimiter rateLimiter;

    @PostMapping
    public ApiResponse<ChatResponse> answer(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        rateLimiter.checkAllowed(httpRequest.getRemoteAddr());
        String username = authentication == null ? null : authentication.getName();
        return ApiResponse.success(chatService.answer(request, username));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter stream(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        rateLimiter.checkAllowed(httpRequest.getRemoteAddr());
        String username = authentication == null ? null : authentication.getName();
        var emitter = new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(60_000L);
        try {
            ChatResponse response = chatService.answer(request, username);
            String content = response.content() == null ? "" : response.content();
            int chunkSize = 80;
            for (int start = 0; start < content.length(); start += chunkSize) {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("token")
                        .data(content.substring(start, Math.min(start + chunkSize, content.length()))));
            }
            emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                    .name("done")
                    .data(response));
            emitter.complete();
        } catch (Exception exception) {
            emitter.completeWithError(exception);
        }
        return emitter;
    }

    @GetMapping("/sessions")
    public ApiResponse<List<ChatSessionSummary>> sessions(Authentication authentication) {
        return ApiResponse.success(historyService.list(requireUser(authentication)));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponse<List<ChatMessage>> messages(
            @PathVariable UUID sessionId,
            Authentication authentication
    ) {
        return ApiResponse.success(historyService.messages(requireUser(authentication), sessionId));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ApiResponse<Void> delete(
            @PathVariable UUID sessionId,
            Authentication authentication
    ) {
        historyService.delete(requireUser(authentication), sessionId);
        return ApiResponse.success(null, "Đã xóa phiên chat");
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Vui lòng đăng nhập để xem lịch sử chat");
        }
        return userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Người dùng không tồn tại"));
    }
}
