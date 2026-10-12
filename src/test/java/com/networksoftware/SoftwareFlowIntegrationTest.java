package com.networksoftware;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networksoftware.service.OtpService;

/** End-to-end: login (OTP) -> upload -> search -> download (incl. Range) -> edit/delete + ownership. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SoftwareFlowIntegrationTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  OtpService otp;

  private final ObjectMapper mapper = new ObjectMapper();

  private String loginAs(String email) throws Exception {
    String code = otp.issueCode(email);
    String body = mapper.writeValueAsString(java.util.Map.of("email", email, "code", code));
    MvcResult result = mvc.perform(post("/api/auth/verify-code")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andReturn();
    JsonNode node = mapper.readTree(result.getResponse().getContentAsString());
    return node.get("token").asText();
  }

  @Test
  void fullFlow() throws Exception {
    String token = loginAs("flow@gmail.com");

    byte[] payload = "fake-binary-content-for-tests-0123456789".getBytes(StandardCharsets.UTF_8);
    MockMultipartFile file = new MockMultipartFile("file", "cool-tool.apk", "application/octet-stream", payload);

    // unauthenticated upload must fail
    mvc.perform(multipart("/api/software")
            .file(file)
            .param("name", "Cool Tool")
            .param("version", "1.0")
            .param("description", "A test app")
            .param("platform", "ANDROID"))
        .andExpect(status().isUnauthorized());

    // authenticated upload succeeds
    MvcResult upload = mvc.perform(multipart("/api/software")
            .file(file)
            .param("name", "Cool Tool")
            .param("version", "1.0.0")
            .param("description", "A test app for the suite")
            .param("platform", "ANDROID")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Cool Tool"))
        .andExpect(jsonPath("$.platform").value("ANDROID"))
        .andExpect(jsonPath("$.publisher.email").value("flow@gmail.com"))
        .andExpect(jsonPath("$.sha256").isNotEmpty())
        .andReturn();
    long id = mapper.readTree(upload.getResponse().getContentAsString()).get("id").asLong();

    // wrong extension for platform is rejected
    MockMultipartFile bad = new MockMultipartFile("file", "evil.exe", "application/octet-stream", payload);
    mvc.perform(multipart("/api/software")
            .file(bad)
            .param("name", "Bad")
            .param("version", "1.0")
            .param("platform", "ANDROID")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("EXTENSION_MISMATCH"));

    // detail exposes publisher identity + IP + time
    mvc.perform(get("/api/software/" + id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.uploaderIp").isNotEmpty())
        .andExpect(jsonPath("$.publishedAt").isNotEmpty());

    // search finds it across all fields
    mvc.perform(get("/api/software").param("q", "cool"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value((int) id));

    // full download returns exact bytes and bumps the counter
    byte[] downloaded = mvc.perform(get("/api/software/" + id + "/download"))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Disposition", containsString("attachment")))
        .andReturn().getResponse().getContentAsByteArray();
    assert downloaded.length == payload.length;

    mvc.perform(get("/api/software/" + id))
        .andExpect(jsonPath("$.downloadCount").value(1));

    // range download -> 206 partial content (resume support)
    mvc.perform(get("/api/software/" + id + "/download").header("Range", "bytes=0-9"))
        .andExpect(status().isPartialContent())
        .andExpect(header().string("Content-Range", startsWith("bytes 0-9/")));

    // owner can edit; stranger gets 403
    String otherToken = loginAs("stranger@gmail.com");
    mvc.perform(put("/api/software/" + id)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Hacked\",\"version\":\"9.9\",\"description\":\"x\"}")
            .header("Authorization", "Bearer " + otherToken))
        .andExpect(status().isForbidden());
    mvc.perform(put("/api/software/" + id)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Cool Tool v2\",\"version\":\"1.1.0\",\"description\":\"updated\"}")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Cool Tool v2"));

    // stranger cannot delete; owner can
    mvc.perform(delete("/api/software/" + id).header("Authorization", "Bearer " + otherToken))
        .andExpect(status().isForbidden());
    mvc.perform(delete("/api/software/" + id).header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());
    mvc.perform(get("/api/software/" + id)).andExpect(status().isNotFound());

    // publishers + stats endpoints
    mvc.perform(get("/api/publishers")).andExpect(status().isOk())
        .andExpect(jsonPath("$[0].email").exists());
    mvc.perform(get("/api/stats")).andExpect(status().isOk())
        .andExpect(jsonPath("$.totalSoftware").exists())
        .andExpect(jsonPath("$.byPlatform.ANDROID").exists());
  }
}
