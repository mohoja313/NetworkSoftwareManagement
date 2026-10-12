package com.networksoftware.dto;

import java.time.Instant;

import com.networksoftware.entity.Publisher;

public record AdminUserDto(
    Long id,
    String email,
    String displayName,
    boolean hasPassword,
    Instant createdAt) {

  public static AdminUserDto of(Publisher p) {
    return new AdminUserDto(p.getId(), p.getEmail(), p.getDisplayName(), p.hasPassword(), p.getCreatedAt());
  }
}
