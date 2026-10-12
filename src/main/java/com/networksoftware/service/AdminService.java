package com.networksoftware.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.networksoftware.config.AppProperties;
import com.networksoftware.dto.ApiException;
import com.networksoftware.entity.AppSetting;
import com.networksoftware.repository.AppSettingRepository;

/**
 * Server manager account — one-time {@code Admin} login, then personal email+password.
 * <ul>
 *   <li>First (and only) time: username {@code app.admin.username} (default "Admin") +
 *       initial password {@code app.admin.password} / {@code APP_ADMIN_PASSWORD} (default "admin").</li>
 *   <li>During that first session the manager registers his own Gmail + password.
 *       From then on the {@code Admin} username is dead — every later manager login
 *       uses his own email + password, and he defines emails/passwords for his team.</li>
 * </ul>
 */
@Service
public class AdminService {

  static final String EMAIL_SETTING_KEY = "admin.email";
  static final String PASSWORD_SALT_KEY = "admin.passwordSalt";
  static final String PASSWORD_HASH_KEY = "admin.passwordHash";

  private final AppProperties props;
  private final AppSettingRepository settings;

  public AdminService(AppProperties props, AppSettingRepository settings) {
    this.props = props;
    this.settings = settings;
  }

  public String configuredUsername() {
    String u = props.getAdmin().getUsername();
    return (u == null || u.isBlank()) ? "Admin" : u.trim();
  }

  public boolean isAdminUsername(String input) {
    if (input == null) return false;
    return configuredUsername().equalsIgnoreCase(input.trim());
  }

  /** Verifies the one-time initial password from YAML/env. */
  public void verifyInitialPassword(String rawPassword) {
    String expected = props.getAdmin().getPassword();
    if (expected == null) expected = "admin";
    String got = rawPassword == null ? "" : rawPassword;
    byte[] a = got.getBytes(StandardCharsets.UTF_8);
    byte[] b = expected.getBytes(StandardCharsets.UTF_8);
    if (a.length == 0 || !MessageDigest.isEqual(a, b)) {
      throw new ApiException(401, "BAD_ADMIN_PASSWORD", "Incorrect admin password.");
    }
  }

  private String setting(String key) {
    return settings.findById(key).map(AppSetting::getValue).orElse("");
  }

  private void saveSetting(String key, String value) {
    settings.findById(key).ifPresentOrElse(
        s -> s.setValue(value),
        () -> settings.save(new AppSetting(key, value)));
  }

  /** True once the manager registered his own email+password (one-time Admin login is dead). */
  @Transactional(readOnly = true)
  public boolean isInitialized() {
    String email = setting(EMAIL_SETTING_KEY);
    String hash = setting(PASSWORD_HASH_KEY);
    return email != null && !email.isBlank() && hash != null && !hash.isBlank();
  }

  /** Effective manager email: DB registration first, then YAML/env default. */
  @Transactional(readOnly = true)
  public String getAdminEmail() {
    String fromDb = setting(EMAIL_SETTING_KEY);
    if (fromDb != null && !fromDb.isBlank()) return fromDb.trim().toLowerCase(Locale.ROOT);
    String yaml = props.getAdmin().getEmail();
    return yaml == null ? "" : yaml.trim().toLowerCase(Locale.ROOT);
  }

  @Transactional(readOnly = true)
  public boolean isEmailSetup() {
    String e = getAdminEmail();
    return e != null && !e.isBlank();
  }

  /**
   * First-time setup: manager registers his own Gmail + password.
   * Only callable before initialization; afterwards the Admin username is unusable.
   */
  @Transactional
  public String setupCredentials(String email, String rawPassword, PasswordService passwords) {
    if (isInitialized()) {
      throw new ApiException(410, "ADMIN_DISABLED",
          "One-time Admin setup is already done. Sign in with your manager email and password.");
    }
    String e = OtpService.normalize(email);
    OtpService.requireGmail(e);
    PasswordService.requireStrongEnough(rawPassword);
    PasswordService.Hashed h = passwords.hash(rawPassword);
    saveSetting(EMAIL_SETTING_KEY, e);
    saveSetting(PASSWORD_SALT_KEY, h.saltHex());
    saveSetting(PASSWORD_HASH_KEY, h.hashHex());
    return e;
  }

  /** Verifies a manager email+password login (after initialization). */
  @Transactional(readOnly = true)
  public void verifyCredentials(String email, String rawPassword) {
    String e = OtpService.normalize(email);
    if (!e.equals(getAdminEmail())
        || !PasswordService.matches(rawPassword, setting(PASSWORD_SALT_KEY), setting(PASSWORD_HASH_KEY))) {
      throw new ApiException(401, "BAD_CREDENTIALS", "Incorrect email or password.");
    }
  }

  /** Manager changes his own password (logged in as admin). */
  @Transactional
  public void changePassword(String currentPassword, String newPassword, PasswordService passwords) {
    if (!isInitialized()) {
      throw new ApiException(400, "ADMIN_NOT_SETUP", "Finish the one-time Admin setup first.");
    }
    if (!PasswordService.matches(currentPassword, setting(PASSWORD_SALT_KEY), setting(PASSWORD_HASH_KEY))) {
      throw new ApiException(401, "BAD_CREDENTIALS", "Current password is incorrect.");
    }
    PasswordService.requireStrongEnough(newPassword);
    PasswordService.Hashed h = passwords.hash(newPassword);
    saveSetting(PASSWORD_SALT_KEY, h.saltHex());
    saveSetting(PASSWORD_HASH_KEY, h.hashHex());
  }

  /** Manager updates his own Gmail (used as sender for user mails). */
  @Transactional
  public String setAdminEmail(String email) {
    String e = OtpService.normalize(email);
    OtpService.requireGmail(e);
    saveSetting(EMAIL_SETTING_KEY, e);
    return e;
  }

  /** Sender address for OTP/password mails: manager email when set, else global default. */
  @Transactional(readOnly = true)
  public String effectiveMailFrom(String fallbackFrom) {
    String adminEmail = getAdminEmail();
    if (adminEmail != null && !adminEmail.isBlank()) return adminEmail;
    return fallbackFrom;
  }
}
