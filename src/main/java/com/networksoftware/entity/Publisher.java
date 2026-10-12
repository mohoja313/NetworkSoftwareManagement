package com.networksoftware.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "publishers", indexes = {
    @Index(name = "idx_publisher_email", columnList = "email", unique = true)
})
public class Publisher {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 320)
  private String email;

  @Column(nullable = false, length = 120)
  private String displayName;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  protected Publisher() {
  }

  public Publisher(String email, String displayName) {
    this.email = email.toLowerCase();
    this.displayName = displayName;
  }

  @PrePersist
  void prePersist() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public Long getId() { return id; }
  public String getEmail() { return email; }
  public String getDisplayName() { return displayName; }
  public void setDisplayName(String displayName) { this.displayName = displayName; }
  public Instant getCreatedAt() { return createdAt; }
}
