import { useCallback, useRef, useState } from "react";
import { IconImage, IconUpload } from "./Icons";
import { cn } from "../utils/cn";

const VALID = ["image/jpeg", "image/jpg", "image/png"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export default function ImageUploader({
  onSelect,
}: {
  onSelect: (dataUrl: string, name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    (file: File) => {
      setError("");
      if (!VALID.includes(file.type)) {
        setError("Please upload a JPG, JPEG or PNG image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image too large. Maximum size is 8MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => onSelect(reader.result as string, file.name);
      reader.onerror = () => setError("Failed to read the file.");
      reader.readAsDataURL(file);
    },
    [onSelect]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
          dragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
            : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        )}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <IconImage width={28} height={28} />
        </div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Drag & drop an image here
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">or click to browse · JPG, PNG up to 8MB</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          <IconUpload width={16} height={16} />
          Choose Image
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
