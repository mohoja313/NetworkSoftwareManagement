package com.networksoftware;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.networksoftware.dto.ApiException;
import com.networksoftware.entity.OtpCode;
import com.networksoftware.repository.OtpCodeRepository;
import com.networksoftware.service.OtpService;

@SpringBootTest
@ActiveProfiles("test")
class OtpServiceTest {

  @Autowired
  OtpService otp;

  @Autowired
  OtpCodeRepository otpCodes;

  @Test
  void rejectsNonGmail() {
    assertThrows(ApiException.class, () -> otp.issueCode("user@yahoo.com"));
    assertThrows(ApiException.class, () -> otp.issueCode("not-an-email"));
  }

  @Test
  void issueAndVerifyRoundTrip() {
    String email = "roundtrip@gmail.com";
    String code = otp.issueCode(email);
    assertNotNull(code);
    assertEquals(6, code.length());
    assertDoesNotThrow(() -> otp.verifyCode(email, code));
    assertTrue(otpCodes.findByEmail(email).isEmpty(), "OTP row must be deleted after success");
  }

  @Test
  void wrongCodeCountsAttemptsAndEventuallyLocks() {
    String email = "attempts@gmail.com";
    otp.issueCode(email);
    for (int i = 0; i < 4; i++) {
      ApiException ex = assertThrows(ApiException.class, () -> otp.verifyCode(email, "000000"));
      assertEquals("OTP_INVALID", ex.getCode(), "attempt " + i);
    }
    ApiException locked = assertThrows(ApiException.class, () -> otp.verifyCode(email, "000000"));
    assertEquals("OTP_LOCKED", locked.getCode());
    // locked row is gone: next verify reports NOT_FOUND
    ApiException gone = assertThrows(ApiException.class, () -> otp.verifyCode(email, "000000"));
    assertEquals("OTP_NOT_FOUND", gone.getCode());
  }

  @Test
  void expiredCodeIsRejected() {
    String email = "expired@gmail.com";
    otp.issueCode(email);
    OtpCode row = otpCodes.findByEmail(email).orElseThrow();
    row.setExpiresAt(Instant.now().minusSeconds(60));
    otpCodes.save(row);
    ApiException ex = assertThrows(ApiException.class, () -> otp.verifyCode(email, "123456"));
    assertEquals("OTP_EXPIRED", ex.getCode());
  }

  @Test
  void cooldownBlocksImmediateReissue() {
    String email = "cooldown@gmail.com";
    otp.issueCode(email);
    ApiException ex = assertThrows(ApiException.class, () -> otp.issueCode(email));
    assertEquals("OTP_COOLDOWN", ex.getCode());
  }
}
