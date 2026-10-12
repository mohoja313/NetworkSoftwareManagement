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

  /** Manager sets (or replaces) a password for a user so they can log in without a code. */
  @Transactional
  public Publisher setPassword(String email, String rawPassword, PasswordService passwords) {
    PasswordService.requireStrongEnough(rawPassword);
    Publisher p = getOrCreate(email);
    PasswordService.Hashed h = passwords.hash(rawPassword);
    p.setPasswordSalt(h.saltHex());
    p.setPasswordHash(h.hashHex());
    return publishers.save(p);
  }

  /** Removes the password (user goes back to code-only login). */
  @Transactional
  public Publisher clearPassword(long id) {
    Publisher p = publishers.findById(id)
        .orElseThrow(() -> new ApiException(404, "NOT_FOUND", "Publisher not found."));
    p.setPasswordSalt(null);
    p.setPasswordHash(null);
    return publishers.save(p);
  }

  /** Verifies an email+password login; throws 401 on any mismatch. */
  @Transactional(readOnly = true)
  public Publisher verifyPassword(String email, String rawPassword) {
    String e = OtpService.normalize(email);
    Publisher p = publishers.findByEmail(e)
        .orElseThrow(() -> new ApiException(401, "BAD_CREDENTIALS", "Incorrect email or password."));
    if (!p.hasPassword() || !PasswordService.matches(rawPassword, p.getPasswordSalt(), p.getPasswordHash())) {
      throw new ApiException(401, "BAD_CREDENTIALS", "Incorrect email or password.");
    }
    return p;
  }
}
