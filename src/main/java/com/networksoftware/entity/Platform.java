package com.networksoftware.entity;

/** Software platform label. Each platform allows only matching file extensions. */
public enum Platform {
  ANDROID,
  WINDOWS,
  LINUX,
  MACOS;

  /** Allowed file extensions (lowercase, without dot). */
  public String[] allowedExtensions() {
    return switch (this) {
      case ANDROID -> new String[] {"apk", "aab", "xapk"};
      case WINDOWS -> new String[] {"exe", "msi", "msix", "zip"};
      case LINUX -> new String[] {"deb", "rpm", "appimage", "tar.gz", "sh", "zip"};
      case MACOS -> new String[] {"dmg", "pkg", "zip"};
    };
  }

  /** Human label shown in the UI. */
  public String label() {
    return switch (this) {
      case ANDROID -> "Android";
      case WINDOWS -> "Windows";
      case LINUX -> "Linux";
      case MACOS -> "macOS";
    };
  }

  /** Case-insensitive parse; throws IllegalArgumentException on unknown value. */
  public static Platform parse(String raw) {
    if (raw == null) throw new IllegalArgumentException("Platform is required");
    try {
      return Platform.valueOf(raw.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Unknown platform: " + raw + ". Expected ANDROID, WINDOWS, LINUX or MACOS.");
    }
  }

  /** True when the filename has an allowed extension for this platform. */
  public boolean extensionAllowed(String filename) {
    if (filename == null) return false;
    String lower = filename.toLowerCase();
    for (String ext : allowedExtensions()) {
      if (lower.endsWith("." + ext)) return true;
    }
    return false;
  }
}
