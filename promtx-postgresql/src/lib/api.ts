import { useAuthStore } from './store';

const API_BASE = '/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const { token, logout } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    // Only auto-logout if we had a token (session expired).
    // Don't redirect if we're already on an auth page (login/register).
    logout();
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || 'API Error');
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.text();
}
