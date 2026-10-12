package com.networksoftware.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.networksoftware.entity.Platform;
import com.networksoftware.entity.Software;

public interface SoftwareRepository extends JpaRepository<Software, Long> {

  long countByPublisherId(Long publisherId);

  @Query("""
      SELECT MIN(s.publishedAt) FROM Software s WHERE s.publisher.id = :publisherId
      """)
  java.time.Instant findFirstPublishedAt(@Param("publisherId") Long publisherId);

  @Query("""
      SELECT s FROM Software s JOIN FETCH s.publisher p
      WHERE (:platform IS NULL OR s.platform = :platform)
        AND (:publisherId IS NULL OR p.id = :publisherId)
        AND (:q IS NULL OR :q = '' OR
             LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%')) OR
             LOWER(s.description) LIKE LOWER(CONCAT('%', :q, '%')) OR
             LOWER(s.version) LIKE LOWER(CONCAT('%', :q, '%')) OR
             LOWER(p.email) LIKE LOWER(CONCAT('%', :q, '%')) OR
             LOWER(p.displayName) LIKE LOWER(CONCAT('%', :q, '%')))
      """)
  Page<Software> search(
      @Param("platform") Platform platform,
      @Param("publisherId") Long publisherId,
      @Param("q") String q,
      Pageable pageable);

  @Query("SELECT COALESCE(SUM(s.downloadCount), 0) FROM Software s")
  long sumDownloadCount();

  @Query("SELECT s.platform AS platform, COUNT(s) AS cnt FROM Software s GROUP BY s.platform")
  java.util.List<PlatformCount> countByPlatform();

  interface PlatformCount {
    Platform getPlatform();
    long getCnt();
  }
}
