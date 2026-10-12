package com.networksoftware.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminChangePasswordRequest(
    @NotBlank(message = "Current password is required")
    String currentPassword,

    @NotBlank(message = "New password is required")
    String newPassword) {
}
