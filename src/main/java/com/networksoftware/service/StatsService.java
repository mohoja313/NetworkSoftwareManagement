package com.networksoftware.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.networksoftware.dto.StatsDto;
import com.networksoftware.entity.Platform;
import com.networksoftware.repository.PublisherRepository;
import com.networksoftware.repository.SoftwareRepository;

@Service
public class StatsService {

  private final SoftwareRepository softwareRepo;
  private final PublisherRepository publisherRepo;

  public StatsService(SoftwareRepository softwareRepo, PublisherRepository publisherRepo) {
    this.softwareRepo = softwareRepo;
    this.publisherRepo = publisherRepo;
  }

  @Transactional(readOnly = true)
  public StatsDto stats() {
    Map<String, Long> byPlatform = new HashMap<>();
    for (Platform p : Platform.values()) byPlatform.put(p.name(), 0L);
    for (SoftwareRepository.PlatformCount c : softwareRepo.countByPlatform()) {
      byPlatform.put(c.getPlatform().name(), c.getCnt());
    }
    return new StatsDto(
        softwareRepo.count(),
        softwareRepo.sumDownloadCount(),
        publisherRepo.count(),
        byPlatform);
  }
}
