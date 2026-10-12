package com.example.wildvn.domain.media;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MediaUrlService {

    private final Optional<MediaUrlSigner> signer;

    public String resolve(String urlOrObjectPath) {
        if (urlOrObjectPath == null || urlOrObjectPath.isBlank() || isExternalUrl(urlOrObjectPath)) {
            return urlOrObjectPath;
        }

        return signer
                .map(mediaUrlSigner -> mediaUrlSigner.signGetUrl(stripLeadingSlash(urlOrObjectPath)))
                .orElse(urlOrObjectPath);
    }

    private boolean isExternalUrl(String value) {
        return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");
    }

    private String stripLeadingSlash(String value) {
        return value.startsWith("/") ? value.substring(1) : value;
    }
}
