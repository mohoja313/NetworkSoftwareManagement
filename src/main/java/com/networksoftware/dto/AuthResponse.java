package com.networksoftware.dto;

public record AuthResponse(
    String token,
    String email,
    String displayName,
    String role,
    boolean isAdmin,
    boolean needEmailSetup,
    String adminEmail) {

  /** Normal user response (keeps old JSON fields, adds role info). */
  public AuthResponse(String token, String email, String displayName) {
    this(token, email, displayName, "user", false, false, null);
  }

  public static AuthResponse user(String token, String email, String displayName) {
    return new AuthResponse(token, email, displayName, "user", false, false, null);
  }

  public static AuthResponse admin(String token, String username, String adminEmail, boolean needEmailSetup) {
    return new AuthResponse(token, username, "Admin", "admin", true, needEmailSetup, adminEmail);
  }
}
