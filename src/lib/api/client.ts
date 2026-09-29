export class ApiError extends Error {
  retryAfter?: number;
  constructor(public status: number, public message: string, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch wrapper with timeout and proper error handling.
 * Default timeout: 10 seconds.
 */
export const fetchClient = async (
  url: string,
  options?: RequestInit & { timeoutMs?: number }
) => {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (url.includes('api.tmdb.org')) {
        const altUrl = url.replace('api.tmdb.org', 'api.themoviedb.org');
        response = await fetch(altUrl, {
          ...options,
          signal: controller.signal,
        });
      } else {
        throw fetchErr;
      }
    }

    if (!response.ok) {
      let message = `API Error: ${response.statusText || response.status}`;
      let errorData: unknown;

      try {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          errorData = json;
          if (json && typeof json === 'object') {
            const raw = json as Record<string, unknown>;
            let parsedMsg = raw.error || raw.status_message || raw.message;

            // Unpack nested JSON string if present in details
            if (raw.details && typeof raw.details === 'string') {
              try {
                const nested = JSON.parse(raw.details);
                if (nested?.status_message) {
                  parsedMsg = nested.status_message;
                }
              } catch {
                // ignore
              }
            }

            if (typeof parsedMsg === 'string' && parsedMsg.trim()) {
              message = parsedMsg.startsWith('API Error:')
                ? parsedMsg
                : `API Error: ${parsedMsg}`;
            }
          }
        } catch {
          if (text && text.trim().length > 0 && text.length < 200) {
            message = `API Error: ${text.trim()}`;
          }
        }
      } catch {
        // Fallback to generic message
      }

      const err = new ApiError(response.status, message, errorData);
      // Capture Retry-After header for 429 responses
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset');
        if (retryAfter) err.retryAfter = Number(retryAfter);
      }
      throw err;
    }

    // Read as text first to handle oversized / malformed JSON gracefully
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError(
        response.status,
        `Invalid JSON response (${text.length} bytes)`
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, `Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};
