export const API_BASE = "https://solve.ivy.homes";
export const API_KEY = "IVY26-D4BC016512F7";

const TOKEN_KEY = "ivy.tokens";

export type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  email: string;
};

export function loadTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Tokens;
    if (!t?.access_token || !t?.refresh_token) return null;
    return t;
  } catch {
    return null;
  }
}

export function saveTokens(t: Tokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

let onAuthLost: (() => void) | null = null;
export function setAuthLostHandler(fn: (() => void) | null) {
  onAuthLost = fn;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function login(email: string, password: string): Promise<Tokens> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(
      res.status,
      res.status === 401 ? "Invalid email or password." : "Login failed.",
    );
  }
  const data = await res.json();
  const tokens: Tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 900) * 1000,
    email: data.user?.email ?? email,
  };
  saveTokens(tokens);
  return tokens;
}

let refreshInFlight: Promise<Tokens> | null = null;

export async function refreshTokens(): Promise<Tokens> {
  if (refreshInFlight) return refreshInFlight;
  const current = loadTokens();
  if (!current) throw new ApiError(401, "Not signed in.");
  refreshInFlight = (async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    if (!res.ok) {
      clearTokens();
      onAuthLost?.();
      throw new ApiError(res.status, "Session expired. Please sign in again.");
    }
    const data = await res.json();
    const tokens: Tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? current.refresh_token,
      expires_at: Date.now() + (data.expires_in ?? 900) * 1000,
      email: data.user?.email ?? current.email,
    };
    saveTokens(tokens);
    return tokens;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function validToken(): Promise<string | undefined> {
  const t = loadTokens();
  if (!t) return undefined;
  // refresh proactively 3 minutes before expiry
  if (Date.now() > t.expires_at - 3 * 60 * 1000) {
    try {
      const fresh = await refreshTokens();
      return fresh.access_token;
    } catch {
      return undefined;
    }
  }
  return t.access_token;
}

type ApiOptions = { method?: string; body?: unknown; auth?: boolean };

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const token = auth ? await validToken() : undefined;

  const send = (tk?: string) =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers: headers(tk),
      body: body === undefined ? null : JSON.stringify(body),
    });

  let res = await send(token);

  if (res.status === 401 && auth) {
    try {
      const fresh = await refreshTokens();
      res = await send(fresh.access_token);
    } catch {
      throw new ApiError(401, "Session expired. Please sign in again.");
    }
  }

  if (res.status === 404) throw new ApiError(404, "Not found.");
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.detail) msg = typeof j.detail === "string" ? j.detail : msg;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
