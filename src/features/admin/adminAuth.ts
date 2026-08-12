export const ADMIN_AUTH_STORAGE_KEY = "roys-admin-auth";
export const ADMIN_SESSION_STORAGE_KEY = "roys-admin-session";

const PBKDF2_ITERATIONS = 210_000;
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const SESSION_IDLE_MS = 15 * 60 * 1000;

interface StoredAdminAuth {
  version: 1;
  algorithm: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  hash: string;
  failedAttempts: number;
  lockedUntil: number;
}

export interface AdminSession {
  authenticated: true;
  lastActivityAt: number;
  expiresAt: number;
}

export type AuthenticationResult =
  | { ok: true; session: AdminSession }
  | { ok: false; reason: "not-configured" | "invalid" | "locked"; lockedUntil?: number };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: Uint8Array.from(salt).buffer,
      iterations,
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function readStoredAuth(): StoredAdminAuth | null {
  const raw = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAdminAuth>;
    if (
      parsed.version !== 1 ||
      parsed.algorithm !== "PBKDF2-SHA256" ||
      typeof parsed.iterations !== "number" ||
      typeof parsed.salt !== "string" ||
      typeof parsed.hash !== "string"
    ) {
      return null;
    }
    return {
      version: 1,
      algorithm: "PBKDF2-SHA256",
      iterations: parsed.iterations,
      salt: parsed.salt,
      hash: parsed.hash,
      failedAttempts: Number(parsed.failedAttempts) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return null;
  }
}

function persistAuth(auth: StoredAdminAuth) {
  localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

function createSession(now: number): AdminSession {
  const session: AdminSession = {
    authenticated: true,
    lastActivityAt: now,
    expiresAt: now + SESSION_IDLE_MS,
  };
  sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function hasAdminPassword(): boolean {
  return readStoredAuth() !== null;
}

export async function configureAdminPassword(password: string): Promise<void> {
  if (password.length < 8) {
    throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS);
  persistAuth({
    version: 1,
    algorithm: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash),
    failedAttempts: 0,
    lockedUntil: 0,
  });
  endAdminSession();
}

export async function authenticateAdmin(
  password: string,
  now = Date.now(),
): Promise<AuthenticationResult> {
  const auth = readStoredAuth();
  if (!auth) return { ok: false, reason: "not-configured" };

  if (auth.lockedUntil > now) {
    return { ok: false, reason: "locked", lockedUntil: auth.lockedUntil };
  }

  if (auth.lockedUntil && auth.lockedUntil <= now) {
    auth.failedAttempts = 0;
    auth.lockedUntil = 0;
  }

  const candidate = await derivePassword(
    password,
    base64ToBytes(auth.salt),
    auth.iterations,
  );
  const matches = constantTimeEqual(candidate, base64ToBytes(auth.hash));

  if (matches) {
    auth.failedAttempts = 0;
    auth.lockedUntil = 0;
    persistAuth(auth);
    return { ok: true, session: createSession(now) };
  }

  auth.failedAttempts += 1;
  if (auth.failedAttempts >= LOCKOUT_ATTEMPTS) {
    auth.lockedUntil = now + LOCKOUT_DURATION_MS;
    persistAuth(auth);
    return {
      ok: false,
      reason: "locked",
      lockedUntil: auth.lockedUntil,
    };
  }
  persistAuth(auth);
  return {
    ok: false,
    reason: "invalid",
  };
}

export function getAdminSession(now = Date.now()): AdminSession | null {
  const raw = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Partial<AdminSession>;
    if (
      session.authenticated !== true ||
      typeof session.lastActivityAt !== "number" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= now
    ) {
      endAdminSession();
      return null;
    }
    return session as AdminSession;
  } catch {
    endAdminSession();
    return null;
  }
}

export function touchAdminSession(now = Date.now()): AdminSession | null {
  const current = getAdminSession(now);
  if (!current) return null;
  return createSession(now);
}

export function endAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}
