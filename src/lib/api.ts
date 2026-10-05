const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function assetUrl(url: string): string {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return url;
  return `${BASE}${url}`;
}

// The JWT now lives in an httpOnly cookie the browser sends automatically; this only
// removes tokens left in localStorage by the old bearer-token flow.
export function clearLegacyToken(): void {
  localStorage.removeItem('adtua_token');
}

// Double-submit CSRF: the backend sets a JS-readable `csrf` cookie at signin and
// requires its value echoed in X-CSRF-Token on state-changing requests.
function csrfHeader(method: string): Record<string, string> {
  if (method === 'GET' || method === 'HEAD') return {};
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? { 'X-CSRF-Token': decodeURIComponent(match[1]) } : {};
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.href = '/signin';
    throw new Error('Unauthorized');
  }
  const body = await res.json() as Record<string, unknown>;
  if (!body['success']) {
    const msg = (body['error'] ?? body['message']) as string | undefined;
    throw new Error(msg ?? 'Request failed');
  }
  const { success: _s, ...rest } = body;
  if (body['data'] !== undefined) return body['data'] as T;
  // Single-resource endpoints return { success, [resource]: {...} } — unwrap the one key,
  // but only when its value is an object/array (not a primitive like otp_token: "string").
  const keys = Object.keys(rest);
  if (keys.length === 1) {
    const val = rest[keys[0]];
    if (val !== null && typeof val === 'object') return val as T;
  }
  return rest as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeader(init.method ?? 'GET'),
      ...(init.headers ?? {}),
    },
  });

  return parseResponse<T>(res);
}

// Session check on page load: a 401 just means "not signed in", so it must not
// trigger the global redirect-to-signin (that would loop on public pages).
export async function fetchCurrentUser<T>(): Promise<T | null> {
  const res = await fetch(`${BASE}/api/user/profile`, { credentials: 'include' });
  if (res.status === 401) return null;
  return parseResponse<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postMultipart: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      body: formData,
      // No Content-Type — browser sets it with multipart boundary
      headers: csrfHeader('POST'),
      credentials: 'include',
    });
    return parseResponse<T>(res);
  },
};