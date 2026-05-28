const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

interface ApiError {
  status: number;
  data: unknown | null;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiClient {
  <T = unknown>(path: string, opts?: ApiOptions): Promise<T | null>;
  get: <T = unknown>(path: string, opts?: ApiOptions) => Promise<T | null>;
  post: <T = unknown>(path: string, opts?: ApiOptions) => Promise<T | null>;
  put: <T = unknown>(path: string, opts?: ApiOptions) => Promise<T | null>;
  patch: <T = unknown>(path: string, opts?: ApiOptions) => Promise<T | null>;
  delete: <T = unknown>(path: string, opts?: ApiOptions) => Promise<T | null>;
}

const api = (async <T = unknown>(
  path: string,
  opts: ApiOptions = {}
): Promise<T | null> => {
  const headers = opts.headers || {};

  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (
    ['POST', 'PUT', 'PATCH'].includes((opts.method ?? 'GET')?.toUpperCase())
  ) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    throw {
      status: res.status,
      data: await res.json().catch(() => null),
    } as ApiError;
  }

  return res.json().catch(() => null);
}) as ApiClient;

api.get = (path: string, opts: ApiOptions = {}) =>
  api(`${path}`, { ...opts, method: 'GET' });

api.post = (path: string, opts: ApiOptions = {}) =>
  api(`${path}`, { ...opts, method: 'POST' });

api.put = (path: string, opts: ApiOptions = {}) =>
  api(`${path}`, { ...opts, method: 'PUT' });

api.patch = (path: string, opts: ApiOptions = {}) =>
  api(`${path}`, { ...opts, method: 'PATCH' });

api.delete = (path: string, opts: ApiOptions = {}) =>
  api(`${path}`, { ...opts, method: 'DELETE' });

/**
  // Type inferred from return type
  const users = await api.get<User[]>('/api/users');
  // users: User[] | null

  // Type-safe POST
  const newUser = await api.post<User>('/api/users', {
    body: { name: 'John', email: 'john@example.com' }
  });
  // newUser: User | null
 */

export default api;
