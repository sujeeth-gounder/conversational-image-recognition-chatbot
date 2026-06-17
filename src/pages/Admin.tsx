import { useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/db";
import { IconChat, IconImage, IconShield, IconTrash, IconUser } from "../components/Icons";

export default function Admin() {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<"users" | "images" | "chat">("users");

  const data = useMemo(() => {
    void version;
    return {
      users: db.getUsers(),
      images: db.getImages(),
      chat: db.getChat(),
    };
  }, [version]);

  const refresh = () => setVersion((v) => v + 1);

  const deleteUser = (id: string, name: string) => {
    if (id === user?.id) {
      alert("You cannot delete your own admin account while logged in.");
      return;
    }
    if (confirm(`Delete user "${name}" and all their data?`)) {
      db.deleteUser(id);
      refresh();
    }
  };

  const deleteImage = (id: string) => {
    if (confirm("Delete this image and its conversation?")) {
      db.deleteImage(id);
      refresh();
    }
  };

  const deleteMessage = (id: string) => {
    db.deleteChat(id);
    refresh();
  };

  const stats = [
    { label: "Total Users", value: data.users.length, icon: IconUser, accent: "bg-gradient-to-br from-indigo-500 to-violet-600" },
    { label: "Total Images", value: data.images.length, icon: IconImage, accent: "bg-gradient-to-br from-emerald-500 to-teal-600" },
    { label: "Chat Messages", value: data.chat.length, icon: IconChat, accent: "bg-gradient-to-br from-pink-500 to-rose-600" },
    { label: "Admins", value: data.users.filter((u) => u.role === "admin").length, icon: IconShield, accent: "bg-gradient-to-br from-amber-500 to-orange-600" },
  ];

  const tabs = [
    { id: "users" as const, label: "Users" },
    { id: "images" as const, label: "Images" },
    { id: "chat" as const, label: "Chat Logs" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <IconShield width={22} height={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage users, monitor usage & moderate content.</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${s.accent}`}>
              <s.icon width={22} height={22} />
            </span>
            <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {tab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: u.avatarColor }}>
                          {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "admin" ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteUser(u.id, u.name)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">
                        <IconTrash width={14} height={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "images" && (
          <div className="p-4">
            {data.images.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No images uploaded yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.images.map((img) => {
                  const owner = data.users.find((u) => u.id === img.userId);
                  return (
                    <div key={img.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <img src={img.dataUrl} alt={img.name} className="aspect-video w-full object-cover" />
                      <div className="p-3">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{img.name}</p>
                        <p className="text-xs text-slate-500">by {owner?.name ?? "Unknown"}</p>
                        <button onClick={() => deleteImage(img.id)} className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">
                          <IconTrash width={14} height={14} /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "chat" && (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {data.chat.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No chat messages yet.</p>
            ) : (
              data.chat
                .slice()
                .reverse()
                .map((c) => {
                  const owner = data.users.find((u) => u.id === c.userId);
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className={`rounded px-1.5 py-0.5 font-semibold ${c.role === "bot" ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {c.role}
                          </span>
                          <span>{owner?.name ?? "Unknown"}</span>
                          <span>·</span>
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{c.text}</p>
                      </div>
                      <button onClick={() => deleteMessage(c.id)} className="shrink-0 rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10" title="Delete message">
                        <IconTrash width={15} height={15} />
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
