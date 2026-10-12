package com.networksoftware.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.networksoftware.config.AppProperties;
import com.networksoftware.dto.ApiException;
import com.networksoftware.entity.OtpCode;
import com.networksoftware.repository.OtpCodeRepository;

/**
 * Gmail OTP flow: only @gmail.com addresses are accepted. A 6-digit code is
 * emailed via SMTP when configured; otherwise it is printed to the console
 * log (dev mode). Only the SHA-256 hash is persisted.
 */
@Service
public class OtpService {

  private static final Logger log = LoggerFactory.getLogger(OtpService.class);
  private static final SecureRandom RANDOM = new SecureRandom();

  private final OtpCodeRepository otpCodes;
  private final AppProperties props;
  private final JavaMailSender mailSender;
  private final AdminService admin;

  @Value("${spring.mail.host:}")
  private String mailHost = "";

  @Value("${spring.mail.from:${app.mail.from:noreply@example.com}}")
  private String mailFrom = "noreply@example.com";

  public OtpService(OtpCodeRepository otpCodes, AppProperties props, JavaMailSender mailSender,
                    AdminService admin) {
    this.otpCodes = otpCodes;
    this.props = props;
    this.mailSender = mailSender;
    this.admin = admin;
  }

  public static String normalize(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }

  public static void requireGmail(String email) {
    String e = normalize(email);
    if (!e.endsWith("@gmail.com") || e.length() <= "@gmail.com".length() || e.contains(" ")) {
      throw new ApiException(400, "ONLY_GMAIL", "Only Gmail addresses (@gmail.com) are accepted.");
    }
  }

  public static String sha256Hex(String raw) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException("SHA-256 unavailable", e);
    }
  }

  /** Issues a new code and returns the raw code (for logging / tests; never expose via API). */
  @Transactional
  public String issueCode(String email) {
    String e = normalize(email);
    requireGmail(e);

    Optional<OtpCode> existing = otpCodes.findByEmail(e);
    if (existing.isPresent()) {
      long sinceUpdate = Duration.between(existing.get().getUpdatedAt(), Instant.now()).getSeconds();
      if (sinceUpdate < props.getOtp().getRequestCooldownSeconds()) {
        long wait = props.getOtp().getRequestCooldownSeconds() - sinceUpdate;
        throw new ApiException(429, "OTP_COOLDOWN",
            "A code was sent recently. Please wait " + wait + " seconds before requesting a new one.");
      }
    }

    String code = String.format("%06d", RANDOM.nextInt(1_000_000));
    Instant expiresAt = Instant.now().plus(Duration.ofMinutes(props.getOtp().getTtlMinutes()));
    OtpCode row = existing.orElseGet(() -> new OtpCode(e, "", expiresAt));
    row.setCodeHash(sha256Hex(code));
    row.setExpiresAt(expiresAt);
    row.setAttempts(0);
    row.setUpdatedAt(Instant.now());
    otpCodes.save(row);

    sendCode(e, code);
    return code;
  }

  /**
   * Verifies a code; throws ApiException on any failure. Deletes the row on success.
   * Note: noRollbackFor — attempt counters / deletions must commit even though we throw.
   */
  @Transactional(noRollbackFor = ApiException.class)
  public void verifyCode(String email, String code) {
    String e = normalize(email);
    requireGmail(e);
    OtpCode row = otpCodes.findByEmail(e)
        .orElseThrow(() -> new ApiException(400, "OTP_NOT_FOUND", "No code was requested for this email. Request a new code."));

    if (Instant.now().isAfter(row.getExpiresAt())) {
      otpCodes.delete(row);
      throw new ApiException(400, "OTP_EXPIRED", "The code has expired. Request a new one.");
    }
    if (row.getAttempts() >= props.getOtp().getMaxAttempts()) {
      otpCodes.delete(row);
      throw new ApiException(429, "OTP_LOCKED", "Too many wrong attempts. Request a new code.");
    }
    if (!MessageDigest.isEqual(
        sha256Hex(code.trim()).getBytes(StandardCharsets.UTF_8),
        row.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
      int attempts = row.getAttempts() + 1;
      if (attempts >= props.getOtp().getMaxAttempts()) {
        otpCodes.delete(row);
        throw new ApiException(429, "OTP_LOCKED", "Too many wrong attempts. Request a new code.");
      }
      row.setAttempts(attempts);
      otpCodes.save(row);
      int left = props.getOtp().getMaxAttempts() - attempts;
      throw new ApiException(400, "OTP_INVALID", "Incorrect code. " + left + " attempt(s) left.");
    }
    otpCodes.delete(row);
  }

  private void sendCode(String email, String code) {
    if (mailHost == null || mailHost.isBlank()) {
      log.warn("DEV-MODE OTP for {} : code = {} (SMTP not configured, set MAIL_HOST to send real emails)", email, code);
      return;
    }
    try {
      SimpleMailMessage msg = new SimpleMailMessage();
      // Sent from the manager's email when configured, else the global default.
      msg.setFrom(admin.effectiveMailFrom(mailFrom));
      msg.setTo(email);
      msg.setSubject("Your Network Software Hub login code");
      msg.setText("Your verification code is: " + code + "\nIt is valid for "
          + props.getOtp().getTtlMinutes() + " minutes.\nIf you did not request it, ignore this email.");
      mailSender.send(msg);
      log.info("OTP email sent to {}", email);
    } catch (MailException ex) {
      log.warn("SMTP send failed for {} : {} — DEV fallback, code = {}", email, ex.getMessage(), code);
    }
  }

  /** Sends a manager-defined password to a user from the manager's email address. */
  public void sendPassword(String email, String rawPassword) {
    if (mailHost == null || mailHost.isBlank()) {
      log.warn("DEV-MODE PASSWORD for {} : password = {} (SMTP not configured, set MAIL_HOST to send real emails)",
          email, rawPassword);
      return;
    }
    try {
      SimpleMailMessage msg = new SimpleMailMessage();
      msg.setFrom(admin.effectiveMailFrom(mailFrom));
      msg.setTo(email);
      msg.setSubject("Your Network Software Hub password");
      msg.setText("Your manager created a password for you: " + rawPassword
          + "\nSign in with your email + this password (or keep using the email code).\n"
          + "If you did not expect this, ignore the email.");
      mailSender.send(msg);
      log.info("Password email sent to {}", email);
    } catch (MailException ex) {
      log.warn("SMTP send failed for {} : {} — DEV fallback, password = {}", email, ex.getMessage(), rawPassword);
    }
  }
}
