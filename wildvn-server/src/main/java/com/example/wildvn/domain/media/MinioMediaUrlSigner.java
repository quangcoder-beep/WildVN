package com.example.wildvn.domain.media;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;

import java.util.concurrent.TimeUnit;

@RequiredArgsConstructor
public class MinioMediaUrlSigner implements MediaUrlSigner {

    private final MinioClient minioClient;
    private final MinioProperties properties;

    @Override
    public String signGetUrl(String objectPath) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(properties.getBucket())
                            .object(objectPath)
                            .expiry(properties.getPresignedUrlTtlSeconds(), TimeUnit.SECONDS)
                            .build()
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể ký URL ảnh", exception);
        }
    }
}
