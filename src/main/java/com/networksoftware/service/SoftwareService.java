package com.networksoftware.service;

import java.io.IOException;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.networksoftware.config.AppProperties;
import com.networksoftware.dto.ApiException;
import com.networksoftware.dto.PageResponse;
import com.networksoftware.dto.SoftwareDto;
import com.networksoftware.dto.SoftwareUpdateRequest;
import com.networksoftware.entity.Platform;
import com.networksoftware.entity.Publisher;
import com.networksoftware.entity.Software;
import com.networksoftware.repository.PublisherRepository;
import com.networksoftware.repository.SoftwareRepository;

/** Controller → Service → Repository: all software use-cases live here. */
@Service
public class SoftwareService {

  private final SoftwareRepository softwareRepo;
  private final PublisherRepository publisherRepo;
  private final StorageService storage;
  private final AppProperties props;

  public SoftwareService(SoftwareRepository softwareRepo, PublisherRepository publisherRepo,
                         StorageService storage, AppProperties props) {
    this.softwareRepo = softwareRepo;
    this.publisherRepo = publisherRepo;
    this.storage = storage;
    this.props = props;
  }

  @Transactional(readOnly = true)
  public PageResponse<SoftwareDto> list(String platformRaw, Long publisherId, String q,
                                        String sort, int page, int size) {
    Platform platform = null;
    if (platformRaw != null && !platformRaw.isBlank()) {
      try {
        platform = Platform.parse(platformRaw);
      } catch (IllegalArgumentException e) {
        throw new ApiException(400, "BAD_PLATFORM", e.getMessage());
      }
    }
    Sort s = switch (sort == null ? "newest" : sort.toLowerCase(Locale.ROOT)) {
      case "popular" -> Sort.by(Sort.Direction.DESC, "downloadCount").and(Sort.by(Sort.Direction.DESC, "publishedAt"));
      case "size" -> Sort.by(Sort.Direction.DESC, "fileSize");
      case "oldest" -> Sort.by(Sort.Direction.ASC, "publishedAt");
      default -> Sort.by(Sort.Direction.DESC, "publishedAt");
    };
    Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), s);
    Page<Software> result = softwareRepo.search(platform, publisherId, q == null ? "" : q.trim(), pageable);
    return new PageResponse<>(
        result.map(SoftwareDto::from).toList(),
        result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public SoftwareDto get(long id) {
    return SoftwareDto.from(require(id));
  }

  @Transactional
  public SoftwareDto publish(String publisherEmail, String uploaderIp,
                             MultipartFile file, MultipartFile icon,
                             String name, String version, String description,
                             String platformRaw) throws IOException {
    if (file == null || file.isEmpty()) {
      throw new ApiException(400, "FILE_REQUIRED", "A software file is required.");
    }
    if (name == null || name.isBlank()) throw new ApiException(400, "NAME_REQUIRED", "Software name is required.");
    if (version == null || version.isBlank()) throw new ApiException(400, "VERSION_REQUIRED", "Version is required.");
    if (name.trim().length() > 200) throw new ApiException(400, "NAME_TOO_LONG", "Name is too long.");
    if (version.trim().length() > 50) throw new ApiException(400, "VERSION_TOO_LONG", "Version is too long.");
    if (description != null && description.length() > 4000) {
      throw new ApiException(400, "DESCRIPTION_TOO_LONG", "Description is too long (max 4000 chars).");
    }
    Platform platform;
    try {
      platform = Platform.parse(platformRaw);
    } catch (IllegalArgumentException e) {
      throw new ApiException(400, "PLATFORM_REQUIRED", e.getMessage());
    }

    String cleanName = StorageService.sanitizeClientFilename(file.getOriginalFilename());
    if (!platform.extensionAllowed(cleanName)) {
      throw new ApiException(400, "EXTENSION_MISMATCH",
          "File extension does not match platform " + platform.label()
              + ". Allowed: " + String.join(", ", platform.allowedExtensions()) + ".");
    }

    String suffix = cleanName.contains(".")
        ? cleanName.substring(cleanName.indexOf('.')).toLowerCase(Locale.ROOT)
        : "";
    StorageService.StoredFile stored = storage.store(file.getInputStream(), suffix, props.getMaxFileSize());

    String iconStoredName = null;
    try {
      if (icon != null && !icon.isEmpty()) {
        String contentType = icon.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
          throw new ApiException(400, "ICON_NOT_IMAGE", "Icon must be an image file.");
        }
        String iconClean = StorageService.sanitizeClientFilename(icon.getOriginalFilename());
        String iconSuffix = iconClean.contains(".")
            ? iconClean.substring(iconClean.lastIndexOf('.')).toLowerCase(Locale.ROOT)
            : ".img";
        iconStoredName = storage.store(icon.getInputStream(), iconSuffix, props.getMaxIconSize()).storedName();
      }

      Publisher publisher = publisherRepo.findByEmail(publisherEmail.toLowerCase(Locale.ROOT))
          .orElseThrow(() -> new ApiException(401, "UNKNOWN_PUBLISHER", "Publisher not found. Log in again."));
      Software sw = new Software();
      sw.setName(name.trim());
      sw.setVersion(version.trim());
      sw.setDescription(description == null ? "" : description.trim());
      sw.setPlatform(platform);
      sw.setFileName(cleanName);
      sw.setStoredName(stored.storedName());
      sw.setFileSize(stored.size());
      sw.setSha256(stored.sha256());
      sw.setIconName(iconStoredName);
      sw.setPublisher(publisher);
      sw.setUploaderIp(uploaderIp);
      return SoftwareDto.from(softwareRepo.save(sw));
    } catch (RuntimeException | IOException e) {
      storage.deleteQuietly(stored.storedName());
      if (iconStoredName != null) storage.deleteQuietly(iconStoredName);
      throw e;
    }
  }

  @Transactional
  public SoftwareDto update(long id, Long publisherId, SoftwareUpdateRequest req) {
    Software sw = require(id);
    if (!sw.getPublisher().getId().equals(publisherId)) {
      throw new ApiException(403, "NOT_OWNER", "Only the publisher can edit this software.");
    }
    if (req.platform() != null && req.platform() != sw.getPlatform()
        && !req.platform().extensionAllowed(sw.getFileName())) {
      throw new ApiException(400, "EXTENSION_MISMATCH",
          "Existing file extension does not match the new platform " + req.platform().label() + ".");
    }
    sw.setName(req.name().trim());
    sw.setVersion(req.version().trim());
    sw.setDescription(req.description() == null ? "" : req.description().trim());
    if (req.platform() != null) sw.setPlatform(req.platform());
    return SoftwareDto.from(sw);
  }

  @Transactional
  public void delete(long id, Long publisherId) {
    Software sw = require(id);
    if (!sw.getPublisher().getId().equals(publisherId)) {
      throw new ApiException(403, "NOT_OWNER", "Only the publisher can delete this software.");
    }
    softwareRepo.delete(sw);
    storage.deleteQuietly(sw.getStoredName());
    storage.deleteQuietly(sw.getIconName());
  }

  /** Loads the entity and initializes the lazy publisher (needed for download/icons). */
  @Transactional
  public Software requireEntity(long id) {
    Software sw = require(id);
    sw.getPublisher().getDisplayName();
    return sw;
  }

  @Transactional
  public void incrementDownloads(long id) {
    Software sw = require(id);
    sw.setDownloadCount(sw.getDownloadCount() + 1);
  }

  private Software require(long id) {
    return softwareRepo.findById(id)
        .orElseThrow(() -> new ApiException(404, "NOT_FOUND", "Software not found."));
  }
}
