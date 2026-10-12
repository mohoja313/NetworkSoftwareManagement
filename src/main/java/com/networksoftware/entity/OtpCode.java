package com.networksoftware.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "otp_codes", indexes = {
    @Index(name = "idx_otp_email", columnList = "email", unique = true)
})
public class OtpCode {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 320)
  private String email;

  /** SHA-256 hex of the 6-digit code (never store raw codes). */
  @Column(nullable = false, length = 64)
  private String codeHash;

  @Column(nullable = false)
  private Instant expiresAt;

  @Column(nullable = false)
  private int attempts = 0;

  @Column(nullable = false)
  private Instant updatedAt = Instant.now();

  protected OtpCode() {
  }

  public OtpCode(String email, String codeHash, Instant expiresAt) {
    this.email = email.toLowerCase();
    this.codeHash = codeHash;
    this.expiresAt = expiresAt;
    this.updatedAt = Instant.now();
  }

  public Long getId() { return id; }
  public String getEmail() { return email; }
  public String getCodeHash() { return codeHash; }
  public void setCodeHash(String codeHash) { this.codeHash = codeHash; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
  public int getAttempts() { return attempts; }
  public void setAttempts(int attempts) { this.attempts = attempts; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
