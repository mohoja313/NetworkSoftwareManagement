package com.networksoftware.dto;

public record AuthResponse(String token, String email, String displayName) {
}
