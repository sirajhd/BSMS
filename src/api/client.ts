import type { ApiResponse } from '../types';

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STORAGE_KEY = 'bsms_auth_session';
const TENANT_STORAGE_KEY = 'bsms_active_tenant_slug';

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode = 400,
    code?: string,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export function getClientTenantSlug(): string | null {
  // 1. Check window hostname for subdomain (e.g. "sirajbarbers.localhost" or "sirajbarbers.bsms.com")
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname.toLowerCase();
    const ignored = ['localhost', '127.0.0.1', 'bsms.com', 'www.bsms.com', 'admin.bsms.com', 'platform.bsms.com'];

    if (!ignored.includes(host)) {
      if (host.endsWith('.localhost')) {
        const sub = host.replace('.localhost', '');
        if (sub && !ignored.includes(sub)) return sub;
      }
      if (host.endsWith('.bsms.com')) {
        const sub = host.replace('.bsms.com', '');
        if (sub && !ignored.includes(sub)) return sub;
      }
      const parts = host.split('.');
      if (parts.length > 2) {
        return parts[0];
      }
    }
  }

  // 2. Check explicitly stored tenant slug
  try {
    const stored = localStorage.getItem(TENANT_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Ignore
  }

  // 3. In development/local preview environments without subdomain, default to seeded demo tenant
  return 'demo-shop';
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    params,
    headers: customHeaders,
    ...customOptions
  } = options;

  let url = `${BASE_URL}${
    endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  }`;

  // Build query string
  if (params) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();

    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Read stored authentication token
  let token: string | null = null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed.token || null;
    }
  } catch {
    // Ignore invalid/missing local storage data
  }

  const isFormData = customOptions.body instanceof FormData;

  const headers = new Headers(customHeaders || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Automatically attach tenant slug header if resolved
  const tenantSlug = getClientTenantSlug();
  if (tenantSlug && !headers.has('x-tenant-slug')) {
    headers.set('x-tenant-slug', tenantSlug);
  }

  // Prevent browser/API caching from producing empty 304 responses.
  headers.set('Cache-Control', 'no-store');

  try {
    const response = await fetch(url, {
      ...customOptions,
      headers,
      cache: 'no-store',
    });

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    if (response.status === 304) {
      throw new ApiError(
        'The server returned a cached response. Please try again.',
        304,
        'NOT_MODIFIED'
      );
    }

    const data: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      message:
        response.statusText ||
        'An unexpected error occurred.',
    }));

    if (!response.ok || !data.success) {
      // Clear stale local token on 401 Unauthorized
      if (response.status === 401) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }

      throw new ApiError(
        data.message ||
          'An error occurred during request.',
        response.status,
        data.code as string,
        data.errors
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error
        ? error.message
        : 'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    );
  }
}
