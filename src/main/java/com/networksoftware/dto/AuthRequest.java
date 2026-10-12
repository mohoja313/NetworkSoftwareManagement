package com.networksoftware.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AuthRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email address")
    String email) {
}

