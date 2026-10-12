package com.networksoftware.security;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.networksoftware.service.JwtService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Parses `Authorization: Bearer <jwt>` and exposes the session via AuthContext. */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwt;

  public JwtAuthFilter(JwtService jwt) {
    this.jwt = jwt;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    try {
      String header = request.getHeader("Authorization");
      if (header != null && header.startsWith("Bearer ")) {
        JwtService.Session s = jwt.verify(header.substring(7).trim());
        if (s != null) {
          AuthContext.set(new AuthContext.Session(s.email(), s.publisherId(), s.role()));
          request.setAttribute("authEmail", s.email());
          request.setAttribute("authPublisherId", s.publisherId());
          request.setAttribute("authRole", s.role());
        }
      }
      chain.doFilter(request, response);
    } finally {
      AuthContext.clear();
    }
  }
}
