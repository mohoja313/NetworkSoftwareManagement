package com.networksoftware.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.networksoftware.dto.ApiException;
import com.networksoftware.dto.PublisherDto;
import com.networksoftware.entity.Publisher;
import com.networksoftware.repository.PublisherRepository;
import com.networksoftware.repository.SoftwareRepository;

@Service
public class PublisherService {

  private final PublisherRepository publishers;
  private final SoftwareRepository softwareRepo;

  public PublisherService(PublisherRepository publishers, SoftwareRepository softwareRepo) {
    this.publishers = publishers;
    this.softwareRepo = softwareRepo;
  }

  @Transactional
  public Publisher getOrCreate(String email) {
    String e = OtpService.normalize(email);
    return publishers.findByEmail(e).orElseGet(() -> {
      String base = e.substring(0, e.indexOf('@'));
      String display = base.isEmpty() ? e : Character.toUpperCase(base.charAt(0)) + base.substring(1);
      return publishers.save(new Publisher(e, display));
    });
  }

  @Transactional(readOnly = true)
  public List<PublisherDto> list() {
    return publishers.findAll().stream()
        .map(p -> PublisherDto.of(p,
            softwareRepo.countByPublisherId(p.getId()),
            softwareRepo.findFirstPublishedAt(p.getId())))
        .sorted((a, b) -> Long.compare(b.softwareCount(), a.softwareCount()))
        .toList();
  }

  @Transactional(readOnly = true)
  public PublisherDto get(long id) {
    Publisher p = publishers.findById(id)
        .orElseThrow(() -> new ApiException(404, "NOT_FOUND", "Publisher not found."));
    return PublisherDto.of(p,
        softwareRepo.countByPublisherId(p.getId()),
        softwareRepo.findFirstPublishedAt(p.getId()));
  }
}
