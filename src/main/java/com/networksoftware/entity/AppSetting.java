package com.networksoftware.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/** Simple key-value store for runtime-mutable settings (e.g. admin email). */
@Entity
@Table(name = "app_settings")
public class AppSetting {

  @Id
  @Column(name = "setting_key", length = 120)
  private String key;

  @Column(name = "setting_value", length = 2000)
  private String value;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  protected AppSetting() {
  }

  public AppSetting(String key, String value) {
    this.key = key;
    this.value = value;
  }

  @PrePersist
  void prePersist() {
    Instant now = Instant.now();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = Instant.now();
  }

  public String getKey() { return key; }
  public String getValue() { return value; }
  public void setValue(String value) { this.value = value; }
  public Instant getUpdatedAt() { return updatedAt; }
}
