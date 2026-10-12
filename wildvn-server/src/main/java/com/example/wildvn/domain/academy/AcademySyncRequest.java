package com.example.wildvn.domain.academy;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AcademySyncRequest {

    @Valid
    @NotNull
    private Payload payload;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Payload {
        @NotNull
        @Size(max = 500)
        private List<@NotBlank @Size(max = 255) String> unlockedSpecies;

        /**
         * Expedition content is not database-backed yet. Keep the field for
         * wire compatibility, but only accept an omitted or empty list.
         */
        @Size(max = 0, message = "completedExpeditions chưa được hỗ trợ vì Academy chưa có catalog")
        private List<@NotBlank @Size(max = 255) String> completedExpeditions;
    }
}
