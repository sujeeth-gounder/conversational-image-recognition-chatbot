import { useState } from "react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/db";

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [savedMsg, setSavedMsg] = useState("");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  if (!user) return null;

  const stats = {
    images: db.getImages(user.id).length,
    messages: db.getChat(user.id).length,
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name: name.trim() || user.name, bio });
    setSavedMsg("Profile updated!");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");
    try {
      await changePassword(current, next);
      setPwMsg("Password changed successfully.");
      setCurrent("");
      setNext("");
      setTimeout(() => setPwMsg(""), 2500);
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : "Failed to change password.");
    }
  };

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>

      {/* Header card */}
      <div className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: user.avatarColor }}>
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
            {user.role === "admin" && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">Admin</span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          <p className="mt-1 text-xs text-slate-400">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.images}</p>
            <p className="text-xs text-slate-500">Images</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.messages}</p>
            <p className="text-xs text-slate-500">Messages</p>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <form onSubmit={saveProfile} className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h3>
        {savedMsg && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">{savedMsg}</p>}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself…" className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>
        <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500">Save Changes</button>
      </form>

      {/* Change password */}
      <form onSubmit={savePassword} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Change Password</h3>
        {pwMsg && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">{pwMsg}</p>}
        {pwErr && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">{pwErr}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Current password</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">New password</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
        </div>
        <button type="submit" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Update Password</button>
      </form>
    </div>
  );
}
