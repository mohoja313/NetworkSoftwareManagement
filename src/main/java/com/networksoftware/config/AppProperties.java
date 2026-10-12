package com.networksoftware.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Tunables from application.yml / environment (STORAGE_PATH, ...). */
@ConfigurationProperties(prefix = "app")
public class AppProperties {

  /** Directory where uploaded files and icons are stored. */
  private String storagePath = "./data/storage";
  /** Max accepted software file size in bytes (default 2 GiB). */
  private long maxFileSize = 2L * 1024 * 1024 * 1024;
  /** Max accepted icon size in bytes (default 5 MiB). */
  private long maxIconSize = 5L * 1024 * 1024;
  private final Otp otp = new Otp();
  private final Jwt jwt = new Jwt();
  private final Mail mail = new Mail();
  private final Admin admin = new Admin();

  public String getStoragePath() { return storagePath; }
  public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
  public long getMaxFileSize() { return maxFileSize; }
  public void setMaxFileSize(long maxFileSize) { this.maxFileSize = maxFileSize; }
  public long getMaxIconSize() { return maxIconSize; }
  public void setMaxIconSize(long maxIconSize) { this.maxIconSize = maxIconSize; }
  public Otp getOtp() { return otp; }
  public Jwt getJwt() { return jwt; }
  public Mail getMail() { return mail; }
  public Admin getAdmin() { return admin; }

  public static class Otp {
    /** OTP validity duration in minutes. */
    private long ttlMinutes = 10;
    /** Max verification attempts before the code is invalidated. */
    private int maxAttempts = 5;
    /** Min seconds between two code requests for the same email. */
    private long requestCooldownSeconds = 60;

    public long getTtlMinutes() { return ttlMinutes; }
    public void setTtlMinutes(long ttlMinutes) { this.ttlMinutes = ttlMinutes; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public long getRequestCooldownSeconds() { return requestCooldownSeconds; }
    public void setRequestCooldownSeconds(long s) { this.requestCooldownSeconds = s; }
  }

  public static class Jwt {
    /** HMAC secret; override via APP_JWT_SECRET env in production. */
    private String secret = "dev-secret-change-me-please-set-APP_JWT_SECRET";
    /** Token validity in days. */
    private long ttlDays = 30;

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
    public long getTtlDays() { return ttlDays; }
    public void setTtlDays(long ttlDays) { this.ttlDays = ttlDays; }
  }

  public static class Mail {
    /** Visible sender address. */
    private String from = "noreply@example.com";

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
  }

  /**
   * Server manager account ("Admin").
   * The password lives here so every deployment can change it via YAML/env:
   * {@code app.admin.password} / {@code APP_ADMIN_PASSWORD} (default "admin").
   */
  public static class Admin {
    /** Username typed instead of an email to log in as manager (case-insensitive). */
    private String username = "Admin";
    /** Manager password; override with APP_ADMIN_PASSWORD in production. */
    private String password = "admin";
    /** Manager Gmail used as the sender for user passwords/codes (set after first login). */
    private String email = "";

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
  }
}
