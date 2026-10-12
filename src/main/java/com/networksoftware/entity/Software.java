package com.networksoftware.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "software", indexes = {
    @Index(name = "idx_software_platform", columnList = "platform"),
    @Index(name = "idx_software_publisher", columnList = "publisher_id"),
    @Index(name = "idx_software_name", columnList = "name"),
    @Index(name = "idx_software_published", columnList = "publishedAt"),
    @Index(name = "idx_software_downloads", columnList = "downloadCount")
})
public class Software {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, length = 50)
  private String version;

  @Column(length = 4000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Platform platform;

  /** Original client filename (sanitized, for display / download name). */
  @Column(nullable = false, length = 255)
  private String fileName;

  /** Random storage filename on disk (UUID based). */
  @Column(nullable = false, length = 255, unique = true)
  private String storedName;

  @Column(nullable = false)
  private long fileSize;

  @Column(nullable = false, length = 64)
  private String sha256;

  /** Random storage filename of the icon, nullable. */
  @Column(length = 255)
  private String iconName;

  @Column(nullable = false)
  private long downloadCount = 0;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "publisher_id", nullable = false)
  private Publisher publisher;

  /** Real uploader IP (X-Forwarded-For aware). */
  @Column(nullable = false, length = 45)
  private String uploaderIp;

  @Column(nullable = false, updatable = false)
  private Instant publishedAt;

  public Software() {
  }

  @PrePersist
  void prePersist() {
    if (publishedAt == null) publishedAt = Instant.now();
  }

  public Long getId() { return id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getVersion() { return version; }
  public void setVersion(String version) { this.version = version; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public Platform getPlatform() { return platform; }
  public void setPlatform(Platform platform) { this.platform = platform; }
  public String getFileName() { return fileName; }
  public void setFileName(String fileName) { this.fileName = fileName; }
  public String getStoredName() { return storedName; }
  public void setStoredName(String storedName) { this.storedName = storedName; }
  public long getFileSize() { return fileSize; }
  public void setFileSize(long fileSize) { this.fileSize = fileSize; }
  public String getSha256() { return sha256; }
  public void setSha256(String sha256) { this.sha256 = sha256; }
  public String getIconName() { return iconName; }
  public void setIconName(String iconName) { this.iconName = iconName; }
  public long getDownloadCount() { return downloadCount; }
  public void setDownloadCount(long downloadCount) { this.downloadCount = downloadCount; }
  public Publisher getPublisher() { return publisher; }
  public void setPublisher(Publisher publisher) { this.publisher = publisher; }
  public String getUploaderIp() { return uploaderIp; }
  public void setUploaderIp(String uploaderIp) { this.uploaderIp = uploaderIp; }
  public Instant getPublishedAt() { return publishedAt; }
}
