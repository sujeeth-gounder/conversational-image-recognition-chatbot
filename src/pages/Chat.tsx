import { useEffect, useMemo, useRef, useState } from "react";
import ImageUploader from "../components/ImageUploader";
import { IconLogo, IconSend, IconSparkle } from "../components/Icons";
import { useAuth } from "../lib/auth";
import { db, uid, type ChatMessage, type ImageRecord } from "../lib/db";
import { analyzeImage, answerQuestion } from "../lib/vision";

const SUGGESTIONS = [
  "What is in this image?",
  "How many people are there?",
  "Describe this image in detail.",
  "What are the dominant colors?",
  "Are there any animals?",
];

const BOX_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#f43f5e", "#8b5cf6",
];

export default function Chat() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<ImageRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recentImages = useMemo(
    () => (user ? db.getImages(user.id).slice(0, 8) : []),
    [user, current]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const loadImage = (rec: ImageRecord) => {
    setCurrent(rec);
    setMessages(db.getChat(user!.id).filter((m) => m.imageId === rec.id));
  };

  const handleUpload = async (dataUrl: string, name: string) => {
    if (!user) return;
    setAnalyzing(true);
    setProgress("Preparing…");
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      const analysis = await analyzeImage(img, setProgress);
      const rec: ImageRecord = {
        id: uid("img"),
        userId: user.id,
        name,
        dataUrl,
        analysis,
        createdAt: Date.now(),
      };
      db.insertImage(rec);

      const greeting: ChatMessage = {
        id: uid("msg"),
        userId: user.id,
        imageId: rec.id,
        role: "bot",
        text: `I've analyzed your image. ${analysis.caption} ${
          analysis.detections.length
            ? `I detected ${analysis.detections.length} object${analysis.detections.length > 1 ? "s" : ""}.`
            : ""
        } Ask me anything about it!`,
        createdAt: Date.now(),
      };
      db.insertChat(greeting);
      setCurrent(rec);
      setMessages([greeting]);
    } catch (e) {
      console.error(e);
      setProgress("");
      alert("Something went wrong while analyzing the image. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !current || !user) return;
    const userMsg: ChatMessage = {
      id: uid("msg"),
      userId: user.id,
      imageId: current.id,
      role: "user",
      text,
      createdAt: Date.now(),
    };
    db.insertChat(userMsg);
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    // simulate brief model latency for a natural feel
    await new Promise((r) => setTimeout(r, 500));
    const reply = answerQuestion(text, current.analysis);
    const botMsg: ChatMessage = {
      id: uid("msg"),
      userId: user.id,
      imageId: current.id,
      role: "bot",
      text: reply,
      createdAt: Date.now(),
    };
    db.insertChat(botMsg);
    setMessages((m) => [...m, botMsg]);
    setThinking(false);
  };

  const reset = () => {
    setCurrent(null);
    setMessages([]);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr_1.3fr]">
      {/* Left: image + analysis */}
      <div className="space-y-4">
        {!current && !analyzing && <ImageUploader onSelect={handleUpload} />}

        {analyzing && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="font-semibold text-slate-800 dark:text-slate-100">Analyzing image…</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{progress}</p>
            <p className="mt-3 max-w-xs text-xs text-slate-400">
              First run downloads the AI models (~10MB). Subsequent analyses are instant.
            </p>
          </div>
        )}

        {current && !analyzing && (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="relative">
                <img src={current.dataUrl} alt={current.name} className="w-full" />
                {/* Bounding boxes */}
                {current.analysis.detections.map((d, i) => {
                  const [x, y, w, h] = d.bbox;
                  const color = BOX_COLORS[i % BOX_COLORS.length];
                  return (
                    <div
                      key={i}
                      className="absolute rounded-md border-2"
                      style={{
                        left: `${(x / current.analysis.width) * 100}%`,
                        top: `${(y / current.analysis.height) * 100}%`,
                        width: `${(w / current.analysis.width) * 100}%`,
                        height: `${(h / current.analysis.height) * 100}%`,
                        borderColor: color,
                        boxShadow: `0 0 0 1px rgba(0,0,0,0.2)`,
                      }}
                    >
                      <span
                        className="absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {d.label} {Math.round(d.score * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">{current.name}</p>
                <button
                  onClick={reset}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <IconSparkle width={14} height={14} /> New Image
                </button>
              </div>
            </div>

            {/* Analysis summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">AI Caption</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{current.analysis.caption}</p>

              {current.analysis.detections.length > 0 && (
                <>
                  <h3 className="mb-2 mt-4 text-sm font-bold text-slate-900 dark:text-white">
                    Detected Objects ({current.analysis.detections.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {current.analysis.detections.map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: BOX_COLORS[i % BOX_COLORS.length] }}
                        />
                        {d.label}
                        <span className="text-slate-400">{Math.round(d.score * 100)}%</span>
                      </span>
                    ))}
                  </div>
                </>
              )}

              {current.analysis.dominantColors.length > 0 && (
                <>
                  <h3 className="mb-2 mt-4 text-sm font-bold text-slate-900 dark:text-white">Dominant Colors</h3>
                  <div className="flex flex-wrap gap-2">
                    {current.analysis.dominantColors.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                        {c.name}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {current.analysis.classifications.length > 0 && (
                <>
                  <h3 className="mb-2 mt-4 text-sm font-bold text-slate-900 dark:text-white">Scene Classification</h3>
                  <div className="space-y-1.5">
                    {current.analysis.classifications.slice(0, 3).map((c, i) => (
                      <div key={i} className="text-xs">
                        <div className="mb-0.5 flex justify-between text-slate-600 dark:text-slate-300">
                          <span className="truncate">{c.label}</span>
                          <span>{Math.round(c.score * 100)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${c.score * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Recent images */}
        {recentImages.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Recent Images</h3>
            <div className="grid grid-cols-4 gap-2">
              {recentImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => loadImage(img)}
                  className={`overflow-hidden rounded-lg border-2 transition ${
                    current?.id === img.id ? "border-indigo-500" : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <img src={img.dataUrl} alt={img.name} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: chat */}
      <div className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <IconLogo width={18} height={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">VisionChat Assistant</p>
            <p className="text-xs text-emerald-500">● Online</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {!current && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <IconSparkle width={40} height={40} className="mb-3 text-indigo-300" />
              <p className="font-medium text-slate-500 dark:text-slate-400">Upload an image to start chatting</p>
              <p className="mt-1 max-w-xs text-sm">Once analyzed, ask me anything about what I see.</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex animate-fade-up ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-indigo-600 text-white"
                    : "rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <div className="flex gap-1">
                  <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                  <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: "200ms" }} />
                  <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: "400ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {current && messages.length < 3 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              disabled={!current}
              placeholder={current ? "Ask about the image…" : "Upload an image first"}
              className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              onClick={send}
              disabled={!current || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              <IconSend width={18} height={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
