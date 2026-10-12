package com.networksoftware.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.networksoftware.dto.ApiException;
import com.networksoftware.dto.AuthRequest;
import com.networksoftware.dto.AuthResponse;
import com.networksoftware.dto.AuthVerifyRequest;
import com.networksoftware.security.AuthContext;
import com.networksoftware.security.ClientIpUtil;
import com.networksoftware.service.JwtService;
import com.networksoftware.service.OtpService;
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

  public AuthController(OtpService otp, JwtService jwt, PublisherService publishers, RateLimitService rateLimit) {
    this.otp = otp;
    this.jwt = jwt;
    this.publishers = publishers;
    this.rateLimit = rateLimit;
  }

  @PostMapping("/request-code")
  public ResponseEntity<Map<String, String>> requestCode(@Valid @RequestBody AuthRequest req,
                                                         HttpServletRequest http) {
    String ip = ClientIpUtil.clientIp(http);
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
    otp.verifyCode(req.email(), req.code());
    var publisher = publishers.getOrCreate(req.email());
    String token = jwt.issue(publisher.getEmail(), publisher.getId());
    return ResponseEntity.ok(new AuthResponse(token, publisher.getEmail(), publisher.getDisplayName()));
  }

  @GetMapping("/me")
  public ResponseEntity<AuthResponse> me() {
    AuthContext.Session s = AuthContext.require();
    var publisher = publishers.getOrCreate(s.email());
    return ResponseEntity.ok(new AuthResponse(null, publisher.getEmail(), publisher.getDisplayName()));
  }
}
