import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { db, type ImageRecord } from "../lib/db";
import { IconChat, IconImage, IconSparkle, IconTrash, IconUpload } from "../components/Icons";

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: React.ComponentType<{ width?: number; height?: number }>; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${accent}`}>
          <Icon width={22} height={22} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  const images = useMemo(() => (user ? db.getImages(user.id) : []), [user, version]);
  const chats = useMemo(() => (user ? db.getChat(user.id) : []), [user, version]);

  const totalObjects = images.reduce((sum, i) => sum + i.analysis.detections.length, 0);
  const userQuestions = chats.filter((c) => c.role === "user").length;

  const remove = (img: ImageRecord) => {
    if (confirm(`Delete "${img.name}" and its conversation?`)) {
      db.deleteImage(img.id);
      setVersion((v) => v + 1);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Here's an overview of your image analyses.</p>
        </div>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
        >
          <IconUpload width={18} height={18} /> New Analysis
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Images Analyzed" value={images.length} icon={IconImage} accent="bg-gradient-to-br from-indigo-500 to-violet-600" />
        <StatCard label="Objects Detected" value={totalObjects} icon={IconSparkle} accent="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard label="Questions Asked" value={userQuestions} icon={IconChat} accent="bg-gradient-to-br from-pink-500 to-rose-600" />
        <StatCard label="Chat Messages" value={chats.length} icon={IconChat} accent="bg-gradient-to-br from-amber-500 to-orange-600" />
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold text-slate-900 dark:text-white">Previous Analyses</h2>

      {images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <IconImage width={40} height={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-600 dark:text-slate-300">No analyses yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload your first image to get started.</p>
          <Link to="/chat" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            <IconUpload width={16} height={16} /> Upload Image
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => {
            const qcount = chats.filter((c) => c.imageId === img.id && c.role === "user").length;
            return (
              <div key={img.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                  <button
                    onClick={() => remove(img)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                    title="Delete"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{img.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{img.analysis.caption}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {img.analysis.detections.slice(0, 4).map((d, i) => (
                      <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                    <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <IconChat width={12} height={12} /> {qcount} question{qcount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
