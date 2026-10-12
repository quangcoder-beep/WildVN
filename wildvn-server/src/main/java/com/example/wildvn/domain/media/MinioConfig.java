package com.example.wildvn.domain.media;

import io.minio.MinioClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@EnableConfigurationProperties(MinioProperties.class)
public class MinioConfig {

    @Bean
    @ConditionalOnProperty(prefix = "wildvn.minio", name = "enabled", havingValue = "true")
    MediaUrlSigner minioMediaUrlSigner(MinioProperties properties) {
        validate(properties);

        MinioClient minioClient = MinioClient.builder()
                .endpoint(properties.getEndpoint())
                .credentials(properties.getAccessKey(), properties.getSecretKey())
                .build();

        return new MinioMediaUrlSigner(minioClient, properties);
    }

    private void validate(MinioProperties properties) {
        if (!StringUtils.hasText(properties.getEndpoint())
                || !StringUtils.hasText(properties.getAccessKey())
                || !StringUtils.hasText(properties.getSecretKey())
                || !StringUtils.hasText(properties.getBucket())) {
            throw new IllegalStateException("MinIO được bật nhưng thiếu cấu hình kết nối bắt buộc");
        }

        if (properties.getPresignedUrlTtlSeconds() < 1 || properties.getPresignedUrlTtlSeconds() > 604800) {
            throw new IllegalStateException("Thời hạn URL ảnh MinIO phải từ 1 đến 604800 giây");
        }
    }
}
