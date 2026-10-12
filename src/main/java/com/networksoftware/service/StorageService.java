package com.networksoftware.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.networksoftware.config.AppProperties;
import com.networksoftware.dto.ApiException;

/**
 * File storage: sanitizes names, stores blobs under random UUID names,
 * streams (never loads whole files into RAM) and computes SHA-256 on the fly.
 */
@Service
public class StorageService {

  private final AppProperties props;

  public StorageService(AppProperties props) {
    this.props = props;
  }

  public Path root() {
    Path root = Paths.get(props.getStoragePath());
    try {
      Files.createDirectories(root);
    } catch (IOException e) {
      throw new IllegalStateException("Cannot create storage directory: " + root, e);
    }
    return root;
  }

  public record StoredFile(String storedName, long size, String sha256) {
  }

  /** Streams the input to disk while hashing; enforces maxSize. */
  public StoredFile store(InputStream in, String suffix, long maxSize) throws IOException {
    String storedName = UUID.randomUUID() + suffix;
    Path target = root().resolve(storedName);
    MessageDigest digest;
    try {
      digest = MessageDigest.getInstance("SHA-256");
    } catch (Exception e) {
      throw new IllegalStateException("SHA-256 unavailable", e);
    }
    long total = 0;
    byte[] buf = new byte[1024 * 1024];
    try (DigestInputStream din = new DigestInputStream(in, digest);
         OutputStream out = Files.newOutputStream(target, StandardOpenOption.CREATE_NEW)) {
      int n;
      while ((n = din.read(buf)) != -1) {
        total += n;
        if (total > maxSize) {
          try { Files.deleteIfExists(target); } catch (IOException ignored) {}
          throw new ApiException(413, "FILE_TOO_LARGE",
              "File exceeds the maximum size of " + formatSize(maxSize) + ".");
        }
        out.write(buf, 0, n);
      }
    } catch (ApiException e) {
      throw e;
    } catch (IOException e) {
      try { Files.deleteIfExists(target); } catch (IOException ignored) {}
      throw e;
    }
    return new StoredFile(storedName, total, HexFormat.of().formatHex(digest.digest()));
  }

  public Path resolve(String storedName) {
    sanitizeStoredName(storedName);
    return root().resolve(storedName);
  }

  public void deleteQuietly(String storedName) {
    if (storedName == null) return;
    try {
      Files.deleteIfExists(resolve(storedName));
    } catch (Exception ignored) {
    }
  }

  /** Guards against path traversal: only flat UUID-based names are allowed. */
  public static void sanitizeStoredName(String name) {
    if (name == null || name.contains("/") || name.contains("\\") || name.contains("..")) {
      throw new ApiException(400, "BAD_FILENAME", "Invalid stored filename.");
    }
  }

  /** Sanitizes a client-provided filename for display / Content-Disposition. */
  public static String sanitizeClientFilename(String original) {
    if (original == null || original.isBlank()) return "file";
    String base = original.replace('\\', '/');
    base = base.substring(base.lastIndexOf('/') + 1);
    base = base.replaceAll("[^A-Za-z0-9._\\-+()\\[\\] ]", "_").trim();
    if (base.isBlank() || base.equals(".") || base.equals("..")) return "file";
    if (base.length() > 180) {
      int dot = base.lastIndexOf('.');
      String ext = dot > 0 ? base.substring(dot) : "";
      base = base.substring(0, Math.min(180 - ext.length(), base.length())) + ext;
    }
    return base;
  }

  public static String formatSize(long bytes) {
    if (bytes < 1024) return bytes + " B";
    double v = bytes;
    String[] units = {"B", "KB", "MB", "GB", "TB"};
    int u = 0;
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
    return String.format("%.1f %s", v, units[u]);
  }
}
