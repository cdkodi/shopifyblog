type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

// Simple in-memory rate limiter using Map
const tokenCaches = new Map<string, Map<string, { count: number; resetTime: number }>>();

export default function rateLimit(options: Options) {
  const interval = options.interval || 60000; // 1 minute default
  const maxTokens = options.uniqueTokenPerInterval || 500;

  return {
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const now = Date.now();
        const cacheKey = `${interval}-${limit}`;
        
        // Get or create cache for this rate limit configuration
        if (!tokenCaches.has(cacheKey)) {
          tokenCaches.set(cacheKey, new Map());
        }
        
        const cache = tokenCaches.get(cacheKey)!;
        const tokenData = cache.get(token);

        // Clean up expired entries periodically
        if (Math.random() < 0.01) { // 1% chance to clean up
          for (const [key, data] of cache.entries()) {
            if (now > data.resetTime) {
              cache.delete(key);
            }
          }
        }

        if (!tokenData || now > tokenData.resetTime) {
          // First request or expired window
          cache.set(token, { count: 1, resetTime: now + interval });
          resolve();
        } else if (tokenData.count >= limit) {
          // Rate limited
          reject();
        } else {
          // Increment count
          tokenData.count++;
          cache.set(token, tokenData);
          resolve();
        }
      }),
  };
} 