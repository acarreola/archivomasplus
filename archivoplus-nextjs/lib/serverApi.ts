import { cookies, headers } from 'next/headers';
import { API_BASE } from './api';
import type { User, Repositorio } from './types';

async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookie = cookies().toString();
  const origin = headers().get('origin') || '';

  const res = await fetch(`${API_BASE}/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      cookie,
    },
    // Ensure CORS with credentials
    cache: 'no-store',
    credentials: 'include',
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    // Try to parse error body
    let errorBody: any = null;
    try { errorBody = await res.json(); } catch {}
    throw new Error(errorBody?.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    // current_user returns {authenticated:false} when not logged in
    const data = await serverFetch<any>('auth/me/');
    if (data && data.authenticated === false) return null;
    return data as User;
  } catch {
    return null;
  }
}

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function listRepos(): Promise<Repositorio[]> {
  const data = await serverFetch<any>('repositorios/');
  if (Array.isArray(data)) return data as Repositorio[];
  if (data && Array.isArray(data.results)) return data.results as Repositorio[];
  return [];
}
