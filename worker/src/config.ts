export const config = {
  dedupWindowDays: parseInt(process.env.DEDUP_WINDOW_DAYS || '7', 10),
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '1', 10),
  pageTimeoutMs: parseInt(process.env.PAGE_TIMEOUT_MS || '30000', 10),
  lockExpiresMinutes: parseInt(process.env.LOCK_EXPIRES_MINUTES || '15', 10),
  maxAttempts: parseInt(process.env.MAX_ATTEMPTS || '2', 10),
  ignoreRobotsTxt: process.env.IGNORE_ROBOTS_TXT === 'true',
  ignoreSSLErrors: process.env.IGNORE_SSL_ERRORS === 'true',
  pollIntervalMs: 5000,
  pollIntervalNoJobMs: 10000,
  shutdownTimeoutMs: 30000,
}

export const HARD_LIMITS = {
  MAX_PAGES_PER_CRAWL: 4,
  MAX_LINKS_PER_PAGE: 10,
  MAX_CRAWL_DURATION_MS: 90000,
  MAX_REQUESTS_PER_SECOND: 1,
  MAX_EMAILS_PER_PAGE: 10,
  MAX_ATTEMPTS: 2,
  EARLY_EXIT_MIN_CONFIDENCE: 95,
} as const

