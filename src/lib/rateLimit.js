const buckets = new Map();

function createRateLimiter({ windowMs, max }) {
  const cleaner = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(ip);
  }, windowMs);
  cleaner.unref();

  return function hit(ip) {
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size > 50_000) buckets.clear();
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }
    bucket.count += 1;
    return { allowed: bucket.count <= max, limit: max, remaining: Math.max(0, max - bucket.count), resetAt: bucket.resetAt };
  };
}

module.exports = { createRateLimiter };
