package com.networksoftware.dto;

import java.time.Instant;

import com.networksoftware.entity.Platform;
import com.networksoftware.entity.Software;
import com.networksoftware.service.StorageService;

/** Outgoing software representation (never exposes storage internals). */
public record SoftwareDto(
    Long id,
    String name,
    String version,
    String description,
    Platform platform,
    String platformLabel,
    String fileName,
    long fileSize,
    String fileSizeFormatted,
    String sha256,
    long downloadCount,
    PublisherRef publisher,
    String uploaderIp,
    Instant publishedAt,
    boolean hasIcon) {

  public record PublisherRef(Long id, String email, String displayName) {
  }

  public static SoftwareDto from(Software s) {
    return new SoftwareDto(
        s.getId(),
        s.getName(),
        s.getVersion(),
        s.getDescription(),
        s.getPlatform(),
        s.getPlatform().label(),
        s.getFileName(),
        s.getFileSize(),
        StorageService.formatSize(s.getFileSize()),
        s.getSha256(),
        s.getDownloadCount(),
        new PublisherRef(
            s.getPublisher().getId(),
            s.getPublisher().getEmail(),
            s.getPublisher().getDisplayName()),
        s.getUploaderIp(),
        s.getPublishedAt(),
        s.getIconName() != null);
  }
}
