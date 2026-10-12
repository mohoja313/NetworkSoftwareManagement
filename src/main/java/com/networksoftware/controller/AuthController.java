package com.networksoftware.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.networksoftware.dto.AdminEmailRequest;
import com.networksoftware.dto.AdminLoginRequest;
import com.networksoftware.dto.AdminSetupRequest;
import com.networksoftware.dto.ApiException;
import com.networksoftware.dto.AuthRequest;
import com.networksoftware.dto.AuthResponse;
import com.networksoftware.dto.AuthVerifyRequest;
import com.networksoftware.dto.PasswordLoginRequest;
import com.networksoftware.security.AuthContext;
import com.networksoftware.security.ClientIpUtil;
import com.networksoftware.service.AdminService;
import com.networksoftware.service.JwtService;
import com.networksoftware.service.OtpService;
import com.networksoftware.service.PasswordService;
import com.networksoftware.service.PublisherService;
import com.networksoftware.service.RateLimitService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

  private final OtpService otp;
  private final JwtService jwt;
  private final PublisherService publishers;
  private final RateLimitService rateLimit;
  private final AdminService admin;
  private final PasswordService passwords;

  public AuthController(OtpService otp, JwtService jwt, PublisherService publishers,
                        RateLimitService rateLimit, AdminService admin, PasswordService passwords) {
    this.otp = otp;
    this.jwt = jwt;
    this.publishers = publishers;
    this.rateLimit = rateLimit;
    this.admin = admin;
    this.passwords = passwords;
  }

  @PostMapping("/request-code")
  public ResponseEntity<Map<String, String>> requestCode(@Valid @RequestBody AuthRequest req,
                                                         HttpServletRequest http) {
    String ip = ClientIpUtil.clientIp(http);
    // "Admin" is reserved for the server manager — it never receives OTP codes.
    if (admin.isAdminUsername(req.email())) {
      throw new ApiException(400, "IS_ADMIN", "Log in as Admin with the manager password, not a code.");
    }
    OtpService.requireGmail(req.email());
    if (!rateLimit.allow("otp:" + ip, 10, 3600)) {
      throw new ApiException(429, "RATE_LIMITED", "Too many code requests from this IP. Try again later.");
    }
    if (!rateLimit.allow("otp:email:" + OtpService.normalize(req.email()), 5, 3600)) {
      throw new ApiException(429, "RATE_LIMITED", "Too many code requests for this email. Try again later.");
    }
    otp.issueCode(req.email());
    return ResponseEntity.ok(Map.of("message", "Verification code sent to " + OtpService.normalize(req.email()) + "."));
  }

  @PostMapping("/verify-code")
  public ResponseEntity<AuthResponse> verifyCode(@Valid @RequestBody AuthVerifyRequest req) {
    if (admin.isAdminUsername(req.email())) {
      throw new ApiException(400, "IS_ADMIN", "Log in as Admin with the manager password, not a code.");
    }
    otp.verifyCode(req.email(), req.code());
    var publisher = publishers.getOrCreate(req.email());
    String token = jwt.issue(publisher.getEmail(), publisher.getId(), "user");
    return ResponseEntity.ok(AuthResponse.user(token, publisher.getEmail(), publisher.getDisplayName()));
  }

  /**
   * Email + password login. The manager signs in here too — with his own
   * registered email + password — and gets an admin token.
   */
  @PostMapping("/password-login")
  public ResponseEntity<AuthResponse> passwordLogin(@Valid @RequestBody PasswordLoginRequest req,
                                                    HttpServletRequest http) {
    String ip = ClientIpUtil.clientIp(http);
    if (admin.isAdminUsername(req.email())) {
      throw new ApiException(410, "ADMIN_DISABLED",
          "One-time Admin login is disabled. Sign in with your manager email and password.");
    }
    if (!rateLimit.allow("pwd:" + ip, 20, 3600)) {
      throw new ApiException(429, "RATE_LIMITED", "Too many login attempts. Try again later.");
    }
    if (!rateLimit.allow("pwd:email:" + OtpService.normalize(req.email()), 10, 3600)) {
      throw new ApiException(429, "RATE_LIMITED", "Too many login attempts for this email. Try again later.");
    }
    // Manager login with his own registered credentials.
    if (admin.isInitialized() && OtpService.normalize(req.email()).equals(admin.getAdminEmail())) {
      admin.verifyCredentials(req.email(), req.password());
      publishers.getOrCreate(req.email());
      String token = jwt.issue(admin.getAdminEmail(), -1L, "admin");
      return ResponseEntity.ok(AuthResponse.admin(token, admin.configuredUsername(), admin.getAdminEmail(), false));
    }
    var publisher = publishers.verifyPassword(req.email(), req.password());
    String token = jwt.issue(publisher.getEmail(), publisher.getId(), "user");
    return ResponseEntity.ok(AuthResponse.user(token, publisher.getEmail(), publisher.getDisplayName()));
  }

  /**
   * ONE-TIME server manager login: username "Admin" (configurable) + initial password
   * ({@code app.admin.password} / {@code APP_ADMIN_PASSWORD}, default "admin").
   * Works only before the manager registers his own email+password; afterwards it
   * answers 410 and the manager signs in with his own credentials.
   */
  @PostMapping("/admin-login")
  public ResponseEntity<AuthResponse> adminLogin(@Valid @RequestBody AdminLoginRequest req,
                                                 HttpServletRequest http) {
    String ip = ClientIpUtil.clientIp(http);
    if (!rateLimit.allow("admin:" + ip, 20, 3600)) {
      throw new ApiException(429, "RATE_LIMITED", "Too many login attempts. Try again later.");
    }
    if (!admin.isAdminUsername(req.username())) {
      throw new ApiException(401, "BAD_ADMIN_USER", "Unknown manager username.");
    }
    if (admin.isInitialized()) {
      throw new ApiException(410, "ADMIN_DISABLED",
          "One-time Admin login is disabled. Sign in with your manager email and password.");
    }
    admin.verifyInitialPassword(req.password());
    String token = jwt.issue(admin.configuredUsername(), -1L, "admin");
    return ResponseEntity.ok(AuthResponse.admin(token, admin.configuredUsername(), admin.getAdminEmail(), true));
  }

  /**
   * ONE-TIME setup, called from the first Admin session: the manager registers
   * his own Gmail + password. This kills the {@code Admin} username login.
   */
  @PostMapping("/admin-setup")
  public ResponseEntity<AuthResponse> adminSetup(@Valid @RequestBody AdminSetupRequest req) {
    AuthContext.Session s = AuthContext.requireAdmin();
    String saved = admin.setupCredentials(req.email(), req.password(), passwords);
    publishers.getOrCreate(saved);
    String token = jwt.issue(saved, -1L, "admin");
    return ResponseEntity.ok(AuthResponse.admin(token, s.email(), saved, false));
  }

  /** Manager updates his own Gmail later (used as sender for user mails). */
  @PostMapping("/admin/email")
  public ResponseEntity<AuthResponse> adminSetEmail(@Valid @RequestBody AdminEmailRequest req) {
    AuthContext.Session s = AuthContext.requireAdmin();
    String saved = admin.setAdminEmail(req.email());
    publishers.getOrCreate(saved);
    String token = jwt.issue(admin.isInitialized() ? saved : admin.configuredUsername(), -1L, "admin");
    return ResponseEntity.ok(AuthResponse.admin(token, s.email(), saved, false));
  }

  @GetMapping("/me")
  public ResponseEntity<AuthResponse> me() {
    AuthContext.Session s = AuthContext.require();
    if (s.isAdmin()) {
      String adminEmail = admin.getAdminEmail();
      return ResponseEntity.ok(AuthResponse.admin(null, s.email(), adminEmail, !admin.isInitialized()));
    }
    var publisher = publishers.getOrCreate(s.email());
    return ResponseEntity.ok(AuthResponse.user(null, publisher.getEmail(), publisher.getDisplayName()));
  }
}
