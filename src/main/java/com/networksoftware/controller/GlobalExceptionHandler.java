package com.networksoftware.controller;

import java.time.Instant;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.networksoftware.dto.ApiException;

import jakarta.servlet.http.HttpServletRequest;

/** Uniform error envelope for every API failure. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException e, HttpServletRequest req) {
    return ResponseEntity.status(e.getStatus()).body(envelope(e.getCode(), e.getMessage(), req));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e,
                                                              HttpServletRequest req) {
    String msg = e.getBindingResult().getFieldErrors().stream()
        .map(f -> f.getField() + ": " + f.getDefaultMessage())
        .findFirst().orElse("Validation failed.");
    return ResponseEntity.badRequest().body(envelope("VALIDATION_ERROR", msg, req));
  }

  @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
  public ResponseEntity<Map<String, Object>> handleMissingStatic(
      org.springframework.web.servlet.resource.NoResourceFoundException e, HttpServletRequest req) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(envelope("NOT_FOUND", "Resource not found.", req));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleOther(Exception e, HttpServletRequest req) {
    log.error("Unhandled error on {}: {}", req.getRequestURI(), e.getMessage(), e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(envelope("INTERNAL_ERROR", "Unexpected server error.", req));
  }

  private static Map<String, Object> envelope(String code, String message, HttpServletRequest req) {
    return Map.of(
        "error", Map.of("code", code, "message", message),
        "path", req.getRequestURI(),
        "timestamp", Instant.now().toString());
  }
}
