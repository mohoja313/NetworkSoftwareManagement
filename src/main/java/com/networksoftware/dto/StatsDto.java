package com.networksoftware.dto;

import java.util.Map;

public record StatsDto(
    long totalSoftware,
    long totalDownloads,
    long totalPublishers,
    Map<String, Long> byPlatform) {
}
