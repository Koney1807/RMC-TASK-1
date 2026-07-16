// Central place for talking to the Quarkus backend.
// Set VITE_API_URL in a .env file when deploying (see README).
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface RegistrationPayload {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  eventName: string;
}

export interface Registration extends RegistrationPayload {
  id: string;
  registeredAt: string;
}

export async function submitRegistration(
  payload: RegistrationPayload
): Promise<Registration> {
  const res = await fetch(`${API_BASE}/api/registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Registration failed. Please check your details.");
  }

  return res.json();
}

// ---- Real accounts: signup / login / JWT session ----
// The token is kept in localStorage so a logged-in user stays logged in
// across a page refresh; it's a short-lived (12h) JWT, not a raw password,
// so this is a normal and reasonable tradeoff.
const TOKEN_KEY = "auth_token";
const USERNAME_KEY = "auth_username";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

function storeSession(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

async function handleAuthResponse(res: Response): Promise<{ token: string; username: string }> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Authentication failed.");
  }
  const data = await res.json();
  storeSession(data.token, data.username);
  return data;
}

export async function signup(username: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return handleAuthResponse(res);
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleAuthResponse(res);
}

// ---- Forgot / reset password ----
// forgotPassword always resolves with the server's generic message (it
// never reveals whether the email matched an account); resetPassword throws
// if the token is invalid or expired.

export async function forgotPassword(email: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message || "Could not process that request.");
  }
  return body?.message ?? "If an account with that email exists, we've sent a password reset link.";
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message || "Could not reset your password.");
  }
  return body?.message ?? "Your password has been reset. You can now log in.";
}

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface RegistrationsPage {
  items: Registration[];
  total: number;
  page: number;
  size: number;
}

export async function fetchRegistrations(
  eventFilter?: string,
  page = 0,
  size = 25
): Promise<RegistrationsPage> {
  const url = new URL(`${API_BASE}/api/admin/registrations`);
  if (eventFilter) url.searchParams.set("event", eventFilter);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const res = await fetch(url.toString(), { headers: authHeader() });

  if (res.status === 401) {
    clearSession();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!res.ok) {
    throw new Error("Could not load registrations.");
  }

  const items = await res.json();
  const total = Number(res.headers.get("X-Total-Count") ?? items.length);
  return { items, total, page, size };
}

export async function deleteRegistration(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/registrations/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (res.status === 401) {
    clearSession();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Could not delete this registration.");
  }
}

export async function updateRegistration(
  id: string,
  payload: RegistrationPayload
): Promise<Registration> {
  const res = await fetch(`${API_BASE}/api/admin/registrations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) {
    clearSession();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Could not update this registration.");
  }
  return res.json();
}

// A plain <a href> can't attach an Authorization header, so the export button
// fetches the CSV with the JWT attached and triggers the download itself.
// Respects the current search filter, so "export" means "export what's on
// screen", not always the entire table.
export async function downloadCsv(eventFilter?: string): Promise<void> {
  const url = new URL(`${API_BASE}/api/admin/registrations/export`);
  if (eventFilter) url.searchParams.set("event", eventFilter);

  const res = await fetch(url.toString(), { headers: authHeader() });
  if (res.status === 401) {
    clearSession();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!res.ok) throw new Error("Could not export registrations.");

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "registrations.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}
