package com.networksoftware.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.networksoftware.dto.StatsDto;
import com.networksoftware.service.StatsService;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

  private final StatsService stats;

  public StatsController(StatsService stats) {
    this.stats = stats;
  }

  @GetMapping
  public StatsDto stats() {
    return stats.stats();
  }
}
