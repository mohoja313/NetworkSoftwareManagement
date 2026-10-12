package com.networksoftware.dto;

import com.networksoftware.entity.Platform;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SoftwareUpdateRequest(
    @NotBlank(message = "Name is required")
    @Size(max = 200, message = "Name is too long")
    String name,

    @NotBlank(message = "Version is required")
    @Size(max = 50, message = "Version is too long")
    String version,

    @Size(max = 4000, message = "Description is too long")
    String description,

    Platform platform) {
}
