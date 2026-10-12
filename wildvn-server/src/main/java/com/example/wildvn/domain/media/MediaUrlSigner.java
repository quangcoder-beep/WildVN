package com.example.wildvn.domain.media;

@FunctionalInterface
public interface MediaUrlSigner {

    String signGetUrl(String objectPath);
}
