package com.networksoftware.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.networksoftware.dto.PublisherDto;
import com.networksoftware.service.PublisherService;

@RestController
@RequestMapping("/api/publishers")
public class PublisherController {

  private final PublisherService publishers;

  public PublisherController(PublisherService publishers) {
    this.publishers = publishers;
  }

  @GetMapping
  public List<PublisherDto> list() {
    return publishers.list();
  }

  @GetMapping("/{id}")
  public PublisherDto get(@PathVariable long id) {
    return publishers.get(id);
  }
}
