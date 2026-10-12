package com.networksoftware.security;

/** Request-scoped authenticated identity, populated by JwtAuthFilter. */
public final class AuthContext {

  private static final ThreadLocal<Session> CURRENT = new ThreadLocal<>();

  private AuthContext() {
  }

  public record Session(String email, Long publisherId, String role) {
    public boolean isAdmin() {
      return "admin".equalsIgnoreCase(role);
    }
  }

  static void set(Session session) {
    CURRENT.set(session);
  }

  static void clear() {
    CURRENT.remove();
  }

  public static Session current() {
    return CURRENT.get();
  }

  public static boolean isAuthenticated() {
    return CURRENT.get() != null;
  }

  /** Throws 401 ApiException when nobody is logged in. */
  public static Session require() {
    Session s = CURRENT.get();
    if (s == null) {
      throw new com.networksoftware.dto.ApiException(401, "UNAUTHORIZED", "Login required. Please sign in with Gmail.");
    }
    return s;
  }

  /** Throws 403 ApiException when the caller is not the server manager. */
  public static Session requireAdmin() {
    Session s = require();
    if (!s.isAdmin()) {
      throw new com.networksoftware.dto.ApiException(403, "ADMIN_ONLY", "Only the server manager (Admin) can do this.");
    }
    return s;
  }
}
