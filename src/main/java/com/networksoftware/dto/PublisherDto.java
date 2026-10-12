package com.networksoftware.dto;

import java.time.Instant;

import com.networksoftware.entity.Publisher;

public record PublisherDto(
    Long id,
    String email,
    String displayName,
    long softwareCount,
    Instant firstPublishedAt,
    Instant joinedAt) {

  public static PublisherDto of(Publisher p, long softwareCount, Instant firstPublishedAt) {
    return new PublisherDto(
        p.getId(), p.getEmail(), p.getDisplayName(),
        softwareCount, firstPublishedAt, p.getCreatedAt());
  }
}
