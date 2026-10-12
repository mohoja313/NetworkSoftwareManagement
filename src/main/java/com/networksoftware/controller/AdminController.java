package com.networksoftware.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.networksoftware.dto.AdminChangePasswordRequest;
import com.networksoftware.dto.AdminEmailRequest;
import com.networksoftware.dto.AdminUpsertUserRequest;
import com.networksoftware.dto.AdminUserDto;
import com.networksoftware.security.AuthContext;
import com.networksoftware.service.AdminService;
import com.networksoftware.service.OtpService;
import com.networksoftware.service.PasswordService;
import com.networksoftware.service.PublisherService;
import com.networksoftware.repository.PublisherRepository;

import jakarta.validation.Valid;

/**
 * Server manager endpoints (all require the Admin JWT).
 * The manager collects his team's emails, sets a password for each,
 * and the password is mailed to the user from the manager's email
 * (or just told to them — both flows work).
 */
@RestController
@RequestMapping("/api/admin")
@Validated
public class AdminController {

  private final AdminService admin;
  private final PublisherService publishers;
  private final PublisherRepository publisherRepo;
  private final PasswordService passwords;
  private final OtpService otp;

  public AdminController(AdminService admin, PublisherService publishers,
                         PublisherRepository publisherRepo, PasswordService passwords, OtpService otp) {
    this.admin = admin;
    this.publishers = publishers;
    this.publisherRepo = publisherRepo;
    this.passwords = passwords;
    this.otp = otp;
  }

  @GetMapping("/info")
  public ResponseEntity<Map<String, Object>> info() {
    AuthContext.requireAdmin();
    return ResponseEntity.ok(Map.of(
        "username", admin.configuredUsername(),
        "email", admin.getAdminEmail(),
        "emailSetup", admin.isEmailSetup()));
  }

  @PostMapping("/email")
  public ResponseEntity<Map<String, String>> setEmail(@Valid @RequestBody AdminEmailRequest req) {
    AuthContext.requireAdmin();
    String saved = admin.setAdminEmail(req.email());
    publishers.getOrCreate(saved);
    return ResponseEntity.ok(Map.of("email", saved));
  }

  @PostMapping("/password")
  public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody AdminChangePasswordRequest req) {
    AuthContext.requireAdmin();
    admin.changePassword(req.currentPassword(), req.newPassword(), passwords);
    return ResponseEntity.ok(Map.of("message", "Manager password updated."));
  }

  @GetMapping("/users")
  public ResponseEntity<List<AdminUserDto>> users() {
    AuthContext.requireAdmin();
    List<AdminUserDto> out = publisherRepo.findAll().stream()
        .map(AdminUserDto::of)
        .sorted((a, b) -> String.CASE_INSENSITIVE_ORDER.compare(a.email(), b.email()))
        .toList();
    return ResponseEntity.ok(out);
  }

  @PostMapping("/users")
  public ResponseEntity<AdminUserDto> upsertUser(@Valid @RequestBody AdminUpsertUserRequest req) {
    AuthContext.requireAdmin();
    String email = OtpService.normalize(req.email());
    OtpService.requireGmail(email);
    var saved = publishers.setPassword(email, req.password(), passwords);
    if (req.displayName() != null && !req.displayName().isBlank()) {
      saved.setDisplayName(req.displayName().trim());
      saved = publisherRepo.save(saved);
    }
    boolean sendEmail = req.sendEmail() == null || req.sendEmail();
    if (sendEmail) {
      otp.sendPassword(email, req.password());
    }
    return ResponseEntity.ok(AdminUserDto.of(saved));
  }

  @DeleteMapping("/users/{id}/password")
  public ResponseEntity<AdminUserDto> clearPassword(@PathVariable long id) {
    AuthContext.requireAdmin();
    return ResponseEntity.ok(AdminUserDto.of(publishers.clearPassword(id)));
  }
}
