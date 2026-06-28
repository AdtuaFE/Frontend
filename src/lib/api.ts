const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function assetUrl(url: string): string {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return url;
  return `${BASE}${url}`;
}

export function getToken(): string | null {
  return localStorage.getItem('adtua_token');
}

export function setToken(token: string): void {
  localStorage.setItem('adtua_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('adtua_token');
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken();
    window.location.href = '/signin';
    throw new Error('Unauthorized');
  }
  const body = await res.json() as Record<string, unknown>;
  if (!body['success']) {
    throw new Error((body['error'] as string | undefined) ?? 'Request failed');
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
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

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
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      body: formData,
      // No Content-Type — browser sets it with multipart boundary
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return parseResponse<T>(res);
  },
};