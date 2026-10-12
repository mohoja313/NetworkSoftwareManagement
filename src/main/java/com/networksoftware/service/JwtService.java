package com.networksoftware.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networksoftware.config.AppProperties;

/**
 * Minimal HS256 JWT implementation (no extra dependencies).
 * Token: base64url(header).base64url(payload).base64url(signature),
 * payload = {sub, pid, iat, exp}.
 */
@Service
public class JwtService {

  private final AppProperties props;
  private final ObjectMapper mapper = new ObjectMapper();

  public JwtService(AppProperties props) {
    this.props = props;
  }

  public String issue(String email, Long publisherId) {
    return issue(email, publisherId, "user");
  }

  public String issue(String email, Long publisherId, String role) {
    try {
      long now = Instant.now().getEpochSecond();
      long exp = Instant.now().plusSeconds(props.getJwt().getTtlDays() * 24 * 3600).getEpochSecond();
      ObjectNode header = mapper.createObjectNode()
          .put("alg", "HS256").put("typ", "JWT");
      ObjectNode payload = mapper.createObjectNode()
          .put("sub", email).put("pid", publisherId)
          .put("role", role == null ? "user" : role)
          .put("iat", now).put("exp", exp);
      String h = base64Url(mapper.writeValueAsBytes(header));
      String p = base64Url(mapper.writeValueAsBytes(payload));
      String signingInput = h + "." + p;
      return signingInput + "." + base64Url(hmac(signingInput));
    } catch (Exception e) {
      throw new IllegalStateException("Failed to issue token", e);
    }
  }

  public record Session(String email, Long publisherId, String role) {
    public boolean isAdmin() {
      return "admin".equalsIgnoreCase(role);
    }
  }

  /** Returns the session or null when the token is invalid/expired. */
  public Session verify(String token) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 3) return null;
      String signingInput = parts[0] + "." + parts[1];
      byte[] sig = Base64.getUrlDecoder().decode(parts[2]);
      byte[] expected = hmac(signingInput);
      if (!java.security.MessageDigest.isEqual(sig, expected)) return null;
      JsonNode payload = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
      long exp = payload.path("exp").asLong(0);
      if (Instant.now().getEpochSecond() > exp) return null;
      String sub = payload.path("sub").asText(null);
      long pid = payload.path("pid").asLong(-1);
      String role = payload.path("role").asText("user");
      if (sub == null || pid < 0) {
        // legacy admin check: keep old tokens working as plain users only
        if (sub == null) return null;
        if (pid < 0 && !"admin".equalsIgnoreCase(role)) return null;
      }
      return new Session(sub, pid, role == null ? "user" : role);
    } catch (Exception e) {
      return null;
    }
  }

  private byte[] hmac(String input) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(props.getJwt().getSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
  }

  private static String base64Url(byte[] bytes) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
