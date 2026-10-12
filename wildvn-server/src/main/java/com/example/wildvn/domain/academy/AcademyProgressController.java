package com.example.wildvn.domain.academy;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/academy")
@RequiredArgsConstructor
public class AcademyProgressController {

    private final AcademyProgressService service;
    private final AcademyOverviewService overviewService;

    @GetMapping("/overview")
    public ApiResponse<AcademyOverviewDto> getOverview() {
        return ApiResponse.success(overviewService.getOverview());
    }

    @GetMapping("/sync")
    public ApiResponse<AcademyProgressDto> getProgress() {
        return ApiResponse.success(service.get(SecurityUtils.getCurrentUsername()));
    }

    @PostMapping("/sync")
    public ApiResponse<AcademyProgressDto> syncProgress(@Valid @RequestBody AcademySyncRequest request) {
        return ApiResponse.success(service.sync(
                SecurityUtils.getCurrentUsername(),
                request.getPayload().getUnlockedSpecies(),
                request.getPayload().getCompletedExpeditions()
        ));
    }
}
