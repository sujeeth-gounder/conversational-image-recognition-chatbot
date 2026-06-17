/**
 * auth.tsx
 * -----------------------------------------------------------------------------
 * Authentication context. Mirrors the backend's JWT auth flow:
 *   POST /register, POST /login, profile management.
 *
 * Passwords are hashed client-side with SHA-256 + per-user salt using the
 * Web Crypto API (SubtleCrypto). In the real Flask backend this would be
 * bcrypt/argon2 server-side; here we never store plaintext passwords.
 *
 * A lightweight "session token" (emulating a JWT) is persisted so the user
 * stays logged in across reloads.
 * -----------------------------------------------------------------------------
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { db, uid, type Role, type User } from "./db";

const SESSION_KEY = "visionchat_session";
const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
];

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type SafeUser = Omit<User, "passwordHash">;

interface AuthContextValue {
  user: SafeUser | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<User, "name" | "bio">>) => void;
  changePassword: (current: string, next: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toSafe(u: User): SafeUser {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

/** Seed a default admin account so the Admin panel is reachable on first run. */
async function ensureSeed() {
  if (db.findUserByEmail("admin@visionchat.ai")) return;
  const salt = makeSalt();
  const passwordHash = `${salt}:${await hashPassword("admin123", salt)}`;
  db.insertUser({
    id: uid("usr"),
    name: "Site Admin",
    email: "admin@visionchat.ai",
    passwordHash,
    role: "admin",
    bio: "Platform administrator.",
    avatarColor: "#6366f1",
    createdAt: Date.now(),
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await ensureSeed();
      const sid = localStorage.getItem(SESSION_KEY);
      if (sid) {
        const found = db.findUserById(sid);
        if (found) setUser(toSafe(found));
      }
      setLoading(false);
    })();
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim()) throw new Error("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (db.findUserByEmail(email)) throw new Error("An account with that email already exists.");

    const salt = makeSalt();
    const passwordHash = `${salt}:${await hashPassword(password, salt)}`;
    const role: Role = "user";
    const newUser: User = {
      id: uid("usr"),
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      role,
      bio: "",
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      createdAt: Date.now(),
    };
    db.insertUser(newUser);
    localStorage.setItem(SESSION_KEY, newUser.id);
    setUser(toSafe(newUser));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const found = db.findUserByEmail(email);
    if (!found) throw new Error("No account found with that email.");
    const [salt, hash] = found.passwordHash.split(":");
    const check = await hashPassword(password, salt);
    if (check !== hash) throw new Error("Incorrect password. Please try again.");
    localStorage.setItem(SESSION_KEY, found.id);
    setUser(toSafe(found));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, "name" | "bio">>) => {
      if (!user) return;
      const updated = db.updateUser(user.id, patch);
      if (updated) setUser(toSafe(updated));
    },
    [user]
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!user) throw new Error("Not authenticated.");
      const found = db.findUserById(user.id);
      if (!found) throw new Error("Account not found.");
      const [salt, hash] = found.passwordHash.split(":");
      const check = await hashPassword(current, salt);
      if (check !== hash) throw new Error("Current password is incorrect.");
      if (next.length < 6) throw new Error("New password must be at least 6 characters.");
      const newSalt = makeSalt();
      const newHash = `${newSalt}:${await hashPassword(next, newSalt)}`;
      db.updateUser(user.id, { passwordHash: newHash });
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, register, login, logout, updateProfile, changePassword }),
    [user, loading, register, login, logout, updateProfile, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
