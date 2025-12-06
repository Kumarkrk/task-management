// lib/api.ts
"use client";

const API_URL = "http://localhost:4000";
// const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;


export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = "tm_access_token";
const REFRESH_KEY = "tm_refresh_token";

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = (await res.json()) as AuthTokens;
  saveTokens(data);
  return data.accessToken;
}

// Generic fetch with auto-refresh
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  auth: boolean = false
) {
  let accessToken = getAccessToken();

  const headers: Record<string, string> = {
  "Content-Type": "application/json",
  ...(options.headers as Record<string, string> || {}),
};


  if (auth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && auth) {
    // try refresh
    const newAccessToken = await refreshTokens();
    if (!newAccessToken) throw new Error("Unauthorized");

   const retryHeaders: Record<string, string> = {
  ...headers,
  Authorization: `Bearer ${newAccessToken}`,
};

    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: retryHeaders,
    });
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody.message || "Request failed";
    throw new Error(msg);
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  saveTokens(data as AuthTokens);
}

export async function registerUser(email: string, password: string) {
  await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  clearTokens();
}
