package com.networksoftware.controller;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.networksoftware.dto.ApiException;
import com.networksoftware.dto.PageResponse;
import com.networksoftware.dto.SoftwareDto;
import com.networksoftware.dto.SoftwareUpdateRequest;
import com.networksoftware.entity.Software;
import com.networksoftware.security.AuthContext;
import com.networksoftware.security.ClientIpUtil;
import com.networksoftware.service.RateLimitService;
import com.networksoftware.service.SoftwareService;
import com.networksoftware.service.StorageService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/software")
public class SoftwareController {

  private final SoftwareService software;
  private final StorageService storage;
  private final RateLimitService rateLimit;

  public SoftwareController(SoftwareService software, StorageService storage, RateLimitService rateLimit) {
    this.software = software;
    this.storage = storage;
    this.rateLimit = rateLimit;
  }

  @GetMapping
  public PageResponse<SoftwareDto> list(
      @RequestParam(required = false) String platform,
      @RequestParam(required = false) Long publisherId,
      @RequestParam(required = false, defaultValue = "") String q,
      @RequestParam(required = false, defaultValue = "newest") String sort,
      @RequestParam(required = false, defaultValue = "0") int page,
      @RequestParam(required = false, defaultValue = "20") int size) {
    return software.list(platform, publisherId, q, sort, page, size);
  }

  @GetMapping("/{id}")
  public SoftwareDto get(@PathVariable long id) {
    return software.get(id);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<SoftwareDto> publish(
      @RequestPart("file") MultipartFile file,
      @RequestPart(value = "icon", required = false) MultipartFile icon,
      @RequestParam String name,
      @RequestParam String version,
      @RequestParam(required = false, defaultValue = "") String description,
      @RequestParam String platform,
      HttpServletRequest http) throws IOException {
    AuthContext.Session s = AuthContext.require();
    String ip = ClientIpUtil.clientIp(http);
    if (!rateLimit.allow("upload:" + ip, 20, 3600)) {
      throw new ApiException(429, "RATE_LIMITED", "Too many uploads from this IP. Try again later.");
    }
    SoftwareDto created = software.publish(s.email(), ip, file, icon, name, version, description, platform);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @PutMapping("/{id}")
  public SoftwareDto update(@PathVariable long id, @Valid @RequestBody SoftwareUpdateRequest req) {
    AuthContext.Session s = AuthContext.require();
    return software.update(id, s.publisherId(), req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable long id) {
    AuthContext.Session s = AuthContext.require();
    software.delete(id, s.publisherId());
    return ResponseEntity.noContent().build();
  }

  /**
   * Public download with HTTP Range (resume) + streaming + download counter.
   * Always served as attachment so files are never executed by the browser.
   */
  @GetMapping("/{id}/download")
  public ResponseEntity<StreamingResponseBody> download(
      @PathVariable long id,
      @RequestHeader(value = "Range", required = false) String range) throws IOException {
    Software sw = software.requireEntity(id);
    Path path = storage.resolve(sw.getStoredName());
    if (!Files.exists(path)) {
      throw new ApiException(410, "FILE_MISSING", "The stored file is missing on the server.");
    }
    long fileSize = Files.size(path);
    long start = 0;
    long end = fileSize - 1;
    boolean partial = false;

    if (range != null && range.startsWith("bytes=")) {
      try {
        String spec = range.substring(6).trim();
        if (spec.startsWith("-")) {
          long suffix = Long.parseLong(spec.substring(1));
          start = Math.max(0, fileSize - suffix);
        } else if (spec.endsWith("-")) {
          start = Long.parseLong(spec.substring(0, spec.length() - 1));
        } else {
          String[] parts = spec.split("-", 2);
          start = Long.parseLong(parts[0]);
          end = Long.parseLong(parts[1]);
        }
        if (start < 0) start = 0;
        if (end >= fileSize) end = fileSize - 1;
        if (start > end || start >= fileSize) {
          return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
              .header("Content-Range", "bytes */" + fileSize)
              .build();
        }
        partial = true;
      } catch (NumberFormatException e) {
        throw new ApiException(400, "BAD_RANGE", "Invalid Range header.");
      }
    }

    final long from = start;
    final long to = end;
    final long length = to - from + 1;
    software.incrementDownloads(id);

    StreamingResponseBody body = (OutputStream out) -> {
      try (InputStream in = Files.newInputStream(path)) {
        in.skip(from);
        byte[] buf = new byte[1024 * 256];
        long remaining = length;
        int n;
        while (remaining > 0 && (n = in.read(buf, 0, (int) Math.min(buf.length, remaining))) != -1) {
          out.write(buf, 0, n);
          remaining -= n;
        }
      }
    };

    var headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
    headers.setContentDisposition(ContentDisposition.attachment().filename(sw.getFileName()).build());
    headers.setContentLength(length);
    headers.set("Accept-Ranges", "bytes");
    if (partial) {
      headers.set("Content-Range", "bytes " + from + "-" + to + "/" + fileSize);
      return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).headers(headers).body(body);
    }
    return ResponseEntity.ok().headers(headers).body(body);
  }

  @GetMapping("/{id}/icon")
  public ResponseEntity<Resource> icon(@PathVariable long id) throws IOException {
    Software sw = software.requireEntity(id);
    if (sw.getIconName() == null) {
      throw new ApiException(404, "NO_ICON", "This software has no icon.");
    }
    Path path = storage.resolve(sw.getIconName());
    if (!Files.exists(path)) {
      throw new ApiException(404, "NO_ICON", "Icon file is missing.");
    }
    String lower = sw.getIconName().toLowerCase();
    MediaType type = lower.endsWith(".png") ? MediaType.IMAGE_PNG
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? MediaType.IMAGE_JPEG
        : lower.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
        : lower.endsWith(".svg") ? MediaType.parseMediaType("image/svg+xml")
        : MediaType.APPLICATION_OCTET_STREAM;
    InputStreamResource resource = new InputStreamResource(Files.newInputStream(path));
    return ResponseEntity.ok()
        .contentType(type)
        .contentLength(Files.size(path))
        .body(resource);
  }
}
