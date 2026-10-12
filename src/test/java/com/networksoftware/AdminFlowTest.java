package com.networksoftware;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Manager flow: one-time Admin login -&gt; register own email+password -&gt;
 * Admin username dies -&gt; manager signs in with own credentials -&gt;
 * defines team passwords -&gt; members sign in with email+password.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminFlowTest {

  @Autowired
  MockMvc mvc;

  private final ObjectMapper mapper = new ObjectMapper();

  private String postJson(String url, String json, int expectedStatus) throws Exception {
    MvcResult r = mvc.perform(post(url)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json))
        .andExpect(status().is(expectedStatus))
        .andReturn();
    return r.getResponse().getContentAsString();
  }

  @Test
  void oneTimeAdminSetupThenOwnCredentials() throws Exception {
    // 1. one-time login with Admin + initial password ("admin" by default)
    String loginBody = postJson("/api/auth/admin-login",
        mapper.writeValueAsString(java.util.Map.of("username", "Admin", "password", "admin")), 200);
    JsonNode login = mapper.readTree(loginBody);
    assert login.get("token").asText().length() > 10;
    assert login.get("isAdmin").asBoolean();
    assert login.get("needEmailSetup").asBoolean();
    String setupToken = login.get("token").asText();

    // wrong initial password fails
    postJson("/api/auth/admin-login",
        mapper.writeValueAsString(java.util.Map.of("username", "Admin", "password", "nope")), 401);

    // 2. manager registers his OWN email + password (one-time setup)
    MvcResult setupRes = mvc.perform(post("/api/auth/admin-setup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(
                java.util.Map.of("email", "boss@gmail.com", "password", "boss-secret")))
            .header("Authorization", "Bearer " + setupToken))
        .andExpect(status().isOk())
        .andReturn();
    JsonNode setup = mapper.readTree(setupRes.getResponse().getContentAsString());
    assert setup.get("needEmailSetup").asBoolean() == false;
    assert setup.get("adminEmail").asText().equals("boss@gmail.com");

    // 3. Admin username is dead now — even with the right initial password
    postJson("/api/auth/admin-login",
        mapper.writeValueAsString(java.util.Map.of("username", "Admin", "password", "admin")), 410);
    postJson("/api/auth/admin-login",
        mapper.writeValueAsString(java.util.Map.of("username", "admin", "password", "admin")), 410);

    // 4. manager signs in with his OWN email + password and gets an admin token
    String mgrBody = postJson("/api/auth/password-login",
        mapper.writeValueAsString(java.util.Map.of("email", "boss@gmail.com", "password", "boss-secret")), 200);
    JsonNode mgr = mapper.readTree(mgrBody);
    assert mgr.get("isAdmin").asBoolean();
    String adminToken = mgr.get("token").asText();

    // wrong manager password fails
    postJson("/api/auth/password-login",
        mapper.writeValueAsString(java.util.Map.of("email", "boss@gmail.com", "password", "wrong")), 401);

    // 5. manager defines a team member (password mailed from manager email; dev-mode logs it)
    mvc.perform(post("/api/admin/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(
                java.util.Map.of("email", "member@gmail.com", "password", "secret123", "sendEmail", false)))
            .header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("member@gmail.com"))
        .andExpect(jsonPath("$.hasPassword").value(true));

    // non-admin cannot use admin endpoints
    mvc.perform(get("/api/admin/users"))
        .andExpect(status().isUnauthorized());

    // 6. member signs in with email+password (no code needed)
    String pwdBody = postJson("/api/auth/password-login",
        mapper.writeValueAsString(java.util.Map.of("email", "member@gmail.com", "password", "secret123")), 200);
    JsonNode pwd = mapper.readTree(pwdBody);
    assert pwd.get("token").asText().length() > 10;
    assert pwd.get("email").asText().equals("member@gmail.com");

    // admin sees the user list
    mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.email == 'member@gmail.com')].hasPassword", hasItem(true)));

    // 7. manager changes his own password; old one stops working
    mvc.perform(post("/api/admin/password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(
                java.util.Map.of("currentPassword", "boss-secret", "newPassword", "boss-new-secret")))
            .header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isOk());
    postJson("/api/auth/password-login",
        mapper.writeValueAsString(java.util.Map.of("email", "boss@gmail.com", "password", "boss-secret")), 401);
    postJson("/api/auth/password-login",
        mapper.writeValueAsString(java.util.Map.of("email", "boss@gmail.com", "password", "boss-new-secret")), 200);
  }
}
