import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../lib/api';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Avisa al AdminApp que la sesión venció para mostrar el login. */
export const SESSION_EXPIRED = 'admin:session-expired';

export async function adminFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE}/api/admin${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401 && path !== '/login') {
    window.dispatchEvent(new Event(SESSION_EXPIRED));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error ?? `Error ${res.status}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export const adminApi = {
  get: <T>(path: string) => adminFetch<T>(path),
  post: <T>(path: string, body: unknown) => adminFetch<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => adminFetch<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => adminFetch<T>(path, { method: 'PATCH', body }),
  del: (path: string) => adminFetch<null>(path, { method: 'DELETE' }),
};

export const adminUrl = (path: string) => `${BASE}/api/admin${path}`;

/** GET del admin con recarga manual. */
export function useAdmin<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data?: T; error?: string }>({
    path: null,
  });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    adminApi.get<T>(path).then(
      (data) => alive && setState({ path, data }),
      (err: unknown) =>
        alive &&
        setState((prev) => ({
          path,
          data: prev.data,
          error: err instanceof Error ? err.message : 'Error de red',
        })),
    );
    return () => {
      alive = false;
    };
  }, [path, nonce]);

  return {
    data: state.path === path ? state.data : undefined,
    error: state.path === path ? state.error : undefined,
    loading: state.path !== path,
    reload,
  };
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.';
}
