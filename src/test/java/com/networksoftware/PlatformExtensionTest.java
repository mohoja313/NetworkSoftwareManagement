package com.networksoftware;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.networksoftware.entity.Platform;

class PlatformExtensionTest {

  @ParameterizedTest
  @CsvSource({
      "ANDROID, app.apk, true",
      "ANDROID, app.aab, true",
      "ANDROID, app.xapk, true",
      "ANDROID, app.exe, false",
      "WINDOWS, setup.exe, true",
      "WINDOWS, setup.msi, true",
      "WINDOWS, setup.msix, true",
      "WINDOWS, app.zip, true",
      "WINDOWS, app.apk, false",
      "LINUX, app.deb, true",
      "LINUX, app.rpm, true",
      "LINUX, app.AppImage, true",
      "LINUX, app.tar.gz, true",
      "LINUX, run.sh, true",
      "LINUX, app.zip, true",
      "LINUX, app.exe, false",
      "MACOS, app.dmg, true",
      "MACOS, app.pkg, true",
      "MACOS, app.zip, true",
      "MACOS, app.deb, false",
  })
  void extensionMatchesPlatform(String platform, String file, boolean expected) {
    assertEquals(expected, Platform.valueOf(platform).extensionAllowed(file));
  }

  @Test
  void parseIsCaseInsensitive() {
    assertEquals(Platform.ANDROID, Platform.parse("android"));
    assertEquals(Platform.MACOS, Platform.parse("macos"));
  }

  @Test
  void parseRejectsUnknown() {
    assertThrows(IllegalArgumentException.class, () -> Platform.parse("ios"));
    assertThrows(IllegalArgumentException.class, () -> Platform.parse(null));
  }
}
