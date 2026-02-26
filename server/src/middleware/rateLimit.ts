const DEFAULT_RATE_LIMIT = 100;
const DEFAULT_WINDOW_SECONDS = 60;

const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, endpoint: string): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();
  
  let cached = rateLimitCache.get(key);
  
  if (!cached || cached.resetTime < now) {
    cached = { count: 0, resetTime: now + DEFAULT_WINDOW_SECONDS * 1000 };
    rateLimitCache.set(key, cached);
  }
  
  cached.count++;
  
  const remaining = Math.max(0, DEFAULT_RATE_LIMIT - cached.count);
  const allowed = cached.count <= DEFAULT_RATE_LIMIT;
  
  return {
    allowed,
    remaining,
    resetTime: Math.ceil((cached.resetTime - now) / 1000)
  };
}

interface Context {
  req: {
    header: (name: string) => string | null;
    path: string;
  };
  header: (name: string, value: string) => void;
  json: (body: unknown, status?: number) => Response;
}

export function rateLimitMiddleware(c: Context, next: () => Promise<Response>) {
  const authHeader = c.req.header("Authorization");
  const ip = c.req.header("X-Forwarded-For") || c.req.header("CF-Connecting-IP") || "unknown";
  const identifier = authHeader ? "authenticated" : ip;
  const endpoint = c.req.path;
  
  const result = checkRateLimit(identifier, endpoint);
  
  c.header("X-RateLimit-Limit", DEFAULT_RATE_LIMIT.toString());
  c.header("X-RateLimit-Remaining", result.remaining.toString());
  c.header("X-RateLimit-Reset", result.resetTime.toString());
  
  if (!result.allowed) {
    return c.json({ 
      error: "Rate limit exceeded",
      retry_after: result.resetTime
    }, 429);
  }
  
  return next();
}
