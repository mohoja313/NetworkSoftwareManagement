package com.networksoftware.service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

/** Tiny in-memory sliding-window rate limiter (per key). */
@Service
public class RateLimitService {

  private final ConcurrentHashMap<String, Deque<Long>> windows = new ConcurrentHashMap<>();

  /**
   * @param key      bucket key (e.g. "otp:1.2.3.4")
   * @param maxHits  allowed hits per window
   * @param windowSeconds window length
   * @return true when allowed (and counted), false when over the limit
   */
  public boolean allow(String key, int maxHits, long windowSeconds) {
    long now = Instant.now().getEpochSecond();
    Deque<Long> dq = windows.computeIfAbsent(key, k -> new ArrayDeque<>());
    synchronized (dq) {
      while (!dq.isEmpty() && dq.peekFirst() <= now - windowSeconds) dq.pollFirst();
      if (dq.size() >= maxHits) return false;
      dq.addLast(now);
      return true;
    }
  }
}
