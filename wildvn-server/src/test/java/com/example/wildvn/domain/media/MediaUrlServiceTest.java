package com.example.wildvn.domain.media;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MediaUrlServiceTest {

    @Test
    void delegatesRelativeObjectPathsToTheBackendSigner() {
        MediaUrlService service = new MediaUrlService(Optional.of(path -> "https://signed.example/" + path));

        assertEquals(
                "https://signed.example/species/saola/thumbnail.jpg",
                service.resolve("/species/saola/thumbnail.jpg")
        );
    }

    @Test
    void preservesExternalUrlsAndUsesRelativePathsWhenMinioIsNotConfigured() {
        MediaUrlService unsignedService = new MediaUrlService(Optional.empty());

        assertEquals("https://images.example/saola.jpg", unsignedService.resolve("https://images.example/saola.jpg"));
        assertEquals("/species/saola/thumbnail.jpg", unsignedService.resolve("/species/saola/thumbnail.jpg"));
    }
}
