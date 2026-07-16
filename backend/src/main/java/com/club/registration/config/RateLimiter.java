package com.club.registration.config;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * A minimal per-key sliding-window rate limiter. Not distributed (state is
 * lost on restart, and each app instance tracks its own counts), which is a
 * real limitation if this is ever scaled to multiple backend instances -
 * but it stops the obvious case (one attacker hammering /api/auth/login or
 * /api/auth/signup from one IP) with zero extra infrastructure.
 */
@ApplicationScoped
public class RateLimiter {

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    /**
     * @return true if the caller identified by {@code key} has made {@code maxAttempts}
     *         or more requests within the last {@code windowMillis} milliseconds
     *         (i.e. this request should be rejected).
     */
    public boolean tooManyAttempts(String key, int maxAttempts, long windowMillis) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = hits.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > windowMillis) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxAttempts) {
                return true;
            }
            timestamps.addLast(now);
            return false;
        }
    }
}
