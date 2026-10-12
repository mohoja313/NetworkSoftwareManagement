package com.networksoftware.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AdminUpsertUserRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email address")
    String email,

    @NotBlank(message = "Password is required")
    String password,

    String displayName,

    /** When true (default), the password is also emailed to the user from the manager's email. */
    Boolean sendEmail) {
}
