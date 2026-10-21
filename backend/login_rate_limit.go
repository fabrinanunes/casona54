package main

import (
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
)

const (
	loginRateLimitWindow  = 15 * time.Minute
	loginRateLimitMax     = 10
	loginRateLimitCleanup = 5 * time.Minute
	loginRateLimitMaxIPs  = 10_000
)

type loginRateLimitEntry struct {
	windowStartedAt time.Time
	attempts        int
}

var loginRateLimiter = struct {
	sync.Mutex
	entries     map[string]loginRateLimitEntry
	lastCleanup time.Time
}{entries: make(map[string]loginRateLimitEntry)}

func loginRateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		clientIP := r.RemoteAddr
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
			clientIP = host
		}

		allowed, retryAfter := allowLoginAttempt(clientIP, time.Now())
		if !allowed {
			w.Header().Set("Retry-After", strconv.Itoa(int(retryAfter.Seconds()+0.5)))
			http.Error(w, "Too many login attempts", http.StatusTooManyRequests)
			return
		}

		next(w, r)
	}
}

func allowLoginAttempt(clientIP string, now time.Time) (bool, time.Duration) {
	loginRateLimiter.Lock()
	defer loginRateLimiter.Unlock()

	if now.Sub(loginRateLimiter.lastCleanup) >= loginRateLimitCleanup {
		for ip, entry := range loginRateLimiter.entries {
			if now.Sub(entry.windowStartedAt) >= loginRateLimitWindow {
				delete(loginRateLimiter.entries, ip)
			}
		}
		loginRateLimiter.lastCleanup = now
	}

	entry, exists := loginRateLimiter.entries[clientIP]
	if !exists || now.Sub(entry.windowStartedAt) >= loginRateLimitWindow {
		if !exists && len(loginRateLimiter.entries) >= loginRateLimitMaxIPs {
			return false, loginRateLimitCleanup
		}

		loginRateLimiter.entries[clientIP] = loginRateLimitEntry{
			windowStartedAt: now,
			attempts:        1,
		}
		return true, 0
	}

	if entry.attempts >= loginRateLimitMax {
		retryAfter := loginRateLimitWindow - now.Sub(entry.windowStartedAt)
		if retryAfter < time.Second {
			retryAfter = time.Second
		}
		return false, retryAfter
	}

	entry.attempts++
	loginRateLimiter.entries[clientIP] = entry
	return true, 0
}
