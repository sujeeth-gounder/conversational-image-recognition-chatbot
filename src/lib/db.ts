/**
 * db.ts
 * -----------------------------------------------------------------------------
 * Browser-side persistence layer that emulates the backend MySQL database.
 *
 * In the reference architecture this maps to the Flask + MySQL backend with
 * the following tables:
 *   - Users        -> User accounts (id, name, email, password hash, role)
 *   - Images       -> Uploaded image records (id, userId, dataUrl, analysis)
 *   - ChatHistory  -> Conversation messages (id, userId, imageId, role, text)
 *   - Admin        -> Admin-managed audit / usage records
 *
 * Each "table" is a JSON collection stored in localStorage. This keeps the
 * front-end fully functional and persistent without a running server, while
 * mirroring the exact data model the real backend would expose over REST.
 * -----------------------------------------------------------------------------
 */

export type Role = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  bio: string;
  avatarColor: string;
  createdAt: number;
}

export interface Detection {
  label: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h
  color?: string;
}

export interface ImageAnalysis {
  caption: string;
  detections: Detection[];
  classifications: { label: string; score: number }[];
  ocrText: string;
  dominantColors: { name: string; hex: string; ratio: number }[];
  width: number;
  height: number;
}

export interface ImageRecord {
  id: string;
  userId: string;
  name: string;
  dataUrl: string;
  analysis: ImageAnalysis;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  imageId: string | null;
  role: "user" | "bot";
  text: string;
  createdAt: number;
}

interface Schema {
  users: User[];
  images: ImageRecord[];
  chat: ChatMessage[];
}

const KEY = "visionchat_db_v1";

const DEFAULT: Schema = {
  users: [],
  images: [],
  chat: [],
};

function load(): Schema {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw) as Schema;
    return {
      users: parsed.users ?? [],
      images: parsed.images ?? [],
      chat: parsed.chat ?? [],
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

function save(db: Schema) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* -------------------------------------------------------------------------- */
/*  Generic table access                                                       */
/* -------------------------------------------------------------------------- */

export const db = {
  getAll: load,
  saveAll: save,

  /* ----- Users ----- */
  getUsers(): User[] {
    return load().users;
  },
  findUserByEmail(email: string): User | undefined {
    return load().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById(id: string): User | undefined {
    return load().users.find((u) => u.id === id);
  },
  insertUser(user: User) {
    const d = load();
    d.users.push(user);
    save(d);
  },
  updateUser(id: string, patch: Partial<User>) {
    const d = load();
    const idx = d.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      d.users[idx] = { ...d.users[idx], ...patch };
      save(d);
      return d.users[idx];
    }
    return undefined;
  },
  deleteUser(id: string) {
    const d = load();
    d.users = d.users.filter((u) => u.id !== id);
    d.images = d.images.filter((i) => i.userId !== id);
    d.chat = d.chat.filter((c) => c.userId !== id);
    save(d);
  },

  /* ----- Images ----- */
  getImages(userId?: string): ImageRecord[] {
    const all = load().images;
    return userId ? all.filter((i) => i.userId === userId) : all;
  },
  findImageById(id: string): ImageRecord | undefined {
    return load().images.find((i) => i.id === id);
  },
  insertImage(image: ImageRecord) {
    const d = load();
    d.images.unshift(image);
    save(d);
  },
  deleteImage(id: string) {
    const d = load();
    d.images = d.images.filter((i) => i.id !== id);
    d.chat = d.chat.filter((c) => c.imageId !== id);
    save(d);
  },

  /* ----- ChatHistory ----- */
  getChat(userId?: string): ChatMessage[] {
    const all = load().chat;
    return userId ? all.filter((c) => c.userId === userId) : all;
  },
  insertChat(msg: ChatMessage) {
    const d = load();
    d.chat.push(msg);
    save(d);
  },
  deleteChat(id: string) {
    const d = load();
    d.chat = d.chat.filter((c) => c.id !== id);
    save(d);
  },
  clearChatForImage(imageId: string) {
    const d = load();
    d.chat = d.chat.filter((c) => c.imageId !== imageId);
    save(d);
  },
};
