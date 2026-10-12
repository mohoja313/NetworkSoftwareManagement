package com.networksoftware.security;

import jakarta.servlet.http.HttpServletRequest;

/** Real client IP, proxy-aware via X-Forwarded-For. */
public final class ClientIpUtil {

  private ClientIpUtil() {
  }

  public static String clientIp(HttpServletRequest request) {
    String xff = request.getHeader("X-Forwarded-For");
    if (xff != null && !xff.isBlank()) {
      String first = xff.split(",")[0].trim();
      if (!first.isEmpty()) return first.length() > 45 ? first.substring(0, 45) : first;
    }
    String remote = request.getRemoteAddr();
    if (remote == null) return "unknown";
    return remote.length() > 45 ? remote.substring(0, 45) : remote;
  }
}
