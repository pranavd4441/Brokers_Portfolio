// --- PropertyOS API Client & JWT Manager ---
// All browser requests go to /api (relative) which Next.js proxies
// to the Django backend via the rewrites rule in next.config.ts.

function getApiUrl() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes("-frontend")) {
      return origin.replace("-frontend", "-backend") + "/api";
    }
    return "/api";
  }
  
  // On the server side (SSR/ISR)
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    return backendUrl.endsWith('/') ? `${backendUrl}api` : `${backendUrl}/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
}

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

// Memory cache for active tokens to avoid redundant localstorage reads
let cachedAccessToken: string | null = null;

export const authTokens = {
  getAccessToken: (): string | null => {
    if (cachedAccessToken) return cachedAccessToken;
    if (typeof window === 'undefined') return null;
    cachedAccessToken = localStorage.getItem('propertyos_access_token');
    return cachedAccessToken;
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('propertyos_refresh_token');
  },
  
  setTokens: (access: string, refresh: string) => {
    cachedAccessToken = access;
    if (typeof window !== 'undefined') {
      localStorage.setItem('propertyos_access_token', access);
      localStorage.setItem('propertyos_refresh_token', refresh);
    }
  },
  
  clearTokens: () => {
    cachedAccessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('propertyos_access_token');
      localStorage.removeItem('propertyos_refresh_token');
    }
  }
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function handleTokenRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        resolve(token);
      });
    });
  }

  const refreshToken = authTokens.getRefreshToken();
  if (!refreshToken) return null;

  isRefreshing = true;

  try {
    const response = await fetch(`${getApiUrl()}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      authTokens.clearTokens();
      isRefreshing = false;
      return null;
    }

    const data = await response.json();
    const newAccess = data.access;
    const newRefresh = data.refresh || refreshToken;

    authTokens.setTokens(newAccess, newRefresh);
    isRefreshing = false;
    onRefreshed(newAccess);
    return newAccess;
  } catch (error) {
    authTokens.clearTokens();
    isRefreshing = false;
    return null;
  }
}

export async function fetchApi<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;
  const accessToken = authTokens.getAccessToken();

  // Build full URL
  const baseUrl = getApiUrl();
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Apply query parameters
  let url = `${baseUrl}${cleanEndpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const query = searchParams.toString();
    if (query) url += `?${query}`;
  }

  // Set default headers
  const defaultHeaders: Record<string, string> = {};
  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    method: 'GET',
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    } as HeadersInit,
  };

  try {
    let response = await fetch(url, config);

    // Handle Token Refresh on 401 Unauthorized
    if (response.status === 401 && authTokens.getRefreshToken()) {
      const newAccessToken = await handleTokenRefresh();
      if (newAccessToken) {
        // Retry the request with the new access token
        const retryHeaders = {
          ...(config.headers as Record<string, string>),
          'Authorization': `Bearer ${newAccessToken}`,
        };
        response = await fetch(url, { ...config, headers: retryHeaders });
      } else {
        // Token refresh failed, clear and redirect to login if on dashboard
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
          window.location.href = '/auth/login';
        }
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    // Detect HTML responses before attempting JSON.parse.
    // This happens when the backend is unreachable and Next.js
    // (or a CDN/proxy) returns its own error/404 HTML page.
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const bodyPreview = await response.text();
      if (bodyPreview.trimStart().startsWith('<')) {
        throw new Error(
          `Backend unavailable — received HTML instead of JSON (${response.status} ${response.statusText}). ` +
          `Make sure Django is running on port 8000.`
        );
      }
      // Some APIs return plain text errors
      throw new Error(bodyPreview || `Unexpected response (${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {
      let errMsg = data.message || data.detail || `API error: ${response.status}`;
      if (data.details && typeof data.details === 'object') {
        const detailParts: string[] = [];
        for (const [key, value] of Object.entries(data.details)) {
          const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
          if (Array.isArray(value)) {
            detailParts.push(`${fieldName}: ${value.join(', ')}`);
          } else {
            detailParts.push(`${fieldName}: ${value}`);
          }
        }
        if (detailParts.length > 0) {
          errMsg = detailParts.join(' | ');
        }
      }
      throw new Error(errMsg);
    }

    return data as T;
  } catch (error: any) {
    // Avoid double-logging SyntaxErrors from bad JSON
    const msg: string = error?.message ?? String(error);
    const isJsonError = msg.includes('JSON') || msg.includes('Unexpected token');
    if (!isJsonError) {
      console.error('fetchApi Error:', msg);
    } else {
      console.error('fetchApi: Received non-JSON response. Is the Django backend running?');
    }
    throw error;
  }
}
