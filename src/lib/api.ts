/**
 * Dear Tomorrow API Client Helper
 * Supports relative API routes (for Vercel serverless & local proxy)
 * and custom deployed backend URLs (via VITE_API_URL).
 */

export function getApiUrl(path: string): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return envUrl ? `${envUrl}${cleanPath}` : cleanPath;
}

export async function parseApiResponse<T = any>(
  response: Response,
  actionDescription = 'Operation'
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || `${actionDescription} failed with status ${response.status}.`);
    }
    return data as T;
  }

  // Handle HTML or text error responses (e.g., from CDN or misconfigured proxy)
  const rawText = await response.text().catch(() => '');
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Backend API endpoint not found (HTTP 404). If your backend is hosted separately, make sure VITE_API_URL is configured in your Vercel Environment Variables. Otherwise, redeploy with the Vercel serverless configuration.`
      );
    }
    throw new Error(
      `${actionDescription} failed (HTTP ${response.status}): ${rawText.slice(0, 120)}`
    );
  }

  return rawText as unknown as T;
}
