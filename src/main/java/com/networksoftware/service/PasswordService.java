package com.networksoftware.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;

import org.springframework.stereotype.Service;

/** Salted SHA-256 passwords for users created by the server manager (no extra deps). */
@Service
public class PasswordService {

  private static final SecureRandom RANDOM = new SecureRandom();

  public record Hashed(String saltHex, String hashHex) {
  }

  public Hashed hash(String rawPassword) {
    byte[] salt = new byte[16];
    RANDOM.nextBytes(salt);
    String saltHex = HexFormat.of().formatHex(salt);
    return new Hashed(saltHex, hash(saltHex, rawPassword));
  }

  public static String hash(String saltHex, String rawPassword) {
    return OtpService.sha256Hex(saltHex + ":" + rawPassword);
  }

  public static boolean matches(String rawPassword, String saltHex, String hashHex) {
    if (rawPassword == null || saltHex == null || hashHex == null) return false;
    byte[] a = hash(saltHex, rawPassword).getBytes(StandardCharsets.UTF_8);
    byte[] b = hashHex.getBytes(StandardCharsets.UTF_8);
    return MessageDigest.isEqual(a, b);
  }

  public static void requireStrongEnough(String password) {
    if (password == null || password.length() < 4) {
      throw new com.networksoftware.dto.ApiException(400, "WEAK_PASSWORD",
          "Password must be at least 4 characters.");
    }
    if (password.length() > 200) {
      throw new com.networksoftware.dto.ApiException(400, "WEAK_PASSWORD", "Password is too long.");
    }
  }
}
