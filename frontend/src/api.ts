import type { AuthResult, MeResult, PageResponse, Platform, Publisher, Software, Stats } from './types';

const TOKEN_KEY = 'nsh_token';
const USER_KEY = 'nsh_user';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuth(token: string, email: string, displayName: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ email, displayName }));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): { email: string; displayName: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as { email: string; displayName: string }) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error?.message === 'string') return data.error.message;
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
    return `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...init, headers });
  if (res.status === 204) return undefined as unknown as T;
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export function requestCode(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyCode(email: string, code: string): Promise<AuthResult> {
  return apiFetch<AuthResult>('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function fetchMe(): Promise<MeResult> {
  return apiFetch<MeResult>('/api/auth/me');
}

export interface SoftwareQuery {
  platform?: string;
  q?: string;
  publisherId?: string | number;
  sort?: 'newest' | 'popular' | 'size' | string;
  page?: number;
  size?: number;
}

export function fetchSoftware(q: SoftwareQuery = {}): Promise<PageResponse<Software>> {
  const p = new URLSearchParams();
  if (q.platform) p.set('platform', String(q.platform));
  if (q.q) p.set('q', q.q);
  if (q.publisherId !== undefined && q.publisherId !== '') p.set('publisherId', String(q.publisherId));
  if (q.sort) p.set('sort', q.sort);
  p.set('page', String(q.page ?? 0));
  p.set('size', String(q.size ?? 20));
  return apiFetch<PageResponse<Software>>(`/api/software?${p.toString()}`);
}

export function fetchSoftwareById(id: string | number): Promise<Software> {
  return apiFetch<Software>(`/api/software/${id}`);
}

export function updateSoftware(
  id: string | number,
  payload: { name: string; version: string; description: string; platform: Platform },
): Promise<Software> {
  return apiFetch<Software>(`/api/software/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteSoftware(id: string | number): Promise<void> {
  return apiFetch<void>(`/api/software/${id}`, { method: 'DELETE' });
}

export function fetchPublishers(): Promise<Publisher[]> {
  return apiFetch<Publisher[]>('/api/publishers');
}

export function fetchPublisher(id: string | number): Promise<Publisher> {
  return apiFetch<Publisher>(`/api/publishers/${id}`);
}

export function fetchStats(): Promise<Stats> {
  return apiFetch<Stats>('/api/stats');
}

export interface UploadPayload {
  file: File;
  icon?: File | null;
  name: string;
  version: string;
  description: string;
  platform: Platform;
}

export function uploadSoftware(payload: UploadPayload, onProgress: (pct: number) => void): Promise<Software> {
  return new Promise<Software>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/software');
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      } else {
        onProgress(50);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(xhr.response as Software);
      } else {
        const r = xhr.response as { error?: { message?: string }; message?: string } | null;
        const msg = r?.error?.message || r?.message || `Upload failed (${xhr.status})`;
        reject(new ApiError(xhr.status, String(msg)));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Network error during upload'));
    xhr.onabort = () => reject(new ApiError(0, 'Upload aborted'));
    const fd = new FormData();
    fd.append('file', payload.file);
    if (payload.icon) fd.append('icon', payload.icon);
    fd.append('name', payload.name);
    fd.append('version', payload.version);
    fd.append('description', payload.description);
    fd.append('platform', payload.platform);
    xhr.send(fd);
  });
}

export function downloadUrl(id: string | number): string {
  return `/api/software/${id}/download`;
}

export function iconUrl(id: string | number): string {
  return `/api/software/${id}/icon`;
}
