import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  IconBolt,
  IconChat,
  IconImage,
  IconSparkle,
  IconUpload,
  IconUser,
} from "../components/Icons";

const features = [
  {
    icon: IconImage,
    title: "Object Detection",
    desc: "Real-time detection of people, animals, vehicles & 80+ object classes with confidence scores — powered by COCO-SSD.",
  },
  {
    icon: IconSparkle,
    title: "Image Captioning",
    desc: "Automatic natural-language captions that summarize the whole scene the moment you upload an image.",
  },
  {
    icon: IconChat,
    title: "Visual Q&A",
    desc: "Ask anything: \"What's in this image?\", \"How many people?\", \"What color is the car?\" and get instant answers.",
  },
  {
    icon: IconBolt,
    title: "Color Analysis",
    desc: "Per-object and whole-image dominant color extraction so the bot can reason about visual appearance.",
  },
];

const questions = [
  "What is in this image?",
  "How many people are there?",
  "What color is the car?",
  "Describe this image in detail.",
  "Are there any animals?",
  "How confident are you?",
];

export default function Home() {
  const { user } = useAuth();
  const cta = user ? "/chat" : "/register";

  return (
    <div className="relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-600/20" />
        <div className="absolute top-40 right-1/4 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl dark:bg-violet-700/20" />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-20 pb-16 text-center sm:px-6">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          <IconSparkle width={16} height={16} />
          AI-Powered Vision-Language Chatbot
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
          Chat with your images.
          <span className="block bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            Ask anything, see everything.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Upload a photo and have a natural conversation about it. VisionChat detects objects,
          generates captions, recognizes colors and answers your questions — all running live in
          your browser.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={cta}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-500 hover:shadow-indigo-500/40"
          >
            <IconUpload width={18} height={18} />
            {user ? "Open Chat" : "Start Free"}
          </Link>
          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <IconUser width={18} height={18} />
              Log in
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Try the demo admin account · admin@visionchat.ai / admin123
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                <f.icon width={22} height={22} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example questions */}
      <section className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ask it like a human</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          VisionChat understands conversational questions about your images.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {questions.map((q) => (
            <span
              key={q}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              “{q}”
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { n: "1", t: "Upload", d: "Drag & drop a JPG or PNG image into the chat." },
            { n: "2", t: "Analyze", d: "On-device AI detects objects, colors & generates a caption." },
            { n: "3", t: "Converse", d: "Ask follow-up questions and keep the conversation going." },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-indigo-500 text-xl font-bold text-indigo-500">
                {s.n}
              </div>
              <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">{s.t}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
