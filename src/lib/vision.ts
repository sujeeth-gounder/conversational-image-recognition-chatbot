/**
 * vision.ts — AI Vision Module (runs entirely in the browser)
 * -----------------------------------------------------------------------------
 * This mirrors the backend "AI Module" composed of:
 *   - Object Detection         -> TensorFlow.js COCO-SSD (replaces YOLOv8)
 *   - Image Classification     -> TensorFlow.js MobileNet
 *   - Image Captioning         -> rule-based generator over detections (BLIP-like)
 *   - Color Analysis           -> canvas pixel sampling + quantization (OpenCV-like)
 *   - OCR Text Recognition     -> hook for Tesseract (graceful no-op in browser demo)
 *   - Visual Question Answering-> natural-language reasoning over the analysis
 *
 * Models are loaded lazily and cached. The first analysis downloads the model
 * weights from Google's TFJS CDN, after which everything runs locally on-device.
 * -----------------------------------------------------------------------------
 */

import "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as mobilenet from "@tensorflow-models/mobilenet";
import type { Detection, ImageAnalysis } from "./db";

let cocoModel: cocoSsd.ObjectDetection | null = null;
let mobilenetModel: mobilenet.MobileNet | null = null;
let loadingPromise: Promise<void> | null = null;

export type LoadStage = "idle" | "loading-models" | "ready";

export async function loadModels(onProgress?: (msg: string) => void): Promise<void> {
  if (cocoModel && mobilenetModel) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    onProgress?.("Loading object detection model…");
    cocoModel = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    onProgress?.("Loading classification model…");
    mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    onProgress?.("Models ready");
  })();
  return loadingPromise;
}

/* -------------------------------------------------------------------------- */
/*  Color utilities                                                            */
/* -------------------------------------------------------------------------- */

const NAMED_COLORS: { name: string; rgb: [number, number, number] }[] = [
  { name: "black", rgb: [0, 0, 0] },
  { name: "white", rgb: [255, 255, 255] },
  { name: "gray", rgb: [128, 128, 128] },
  { name: "silver", rgb: [192, 192, 192] },
  { name: "red", rgb: [220, 40, 40] },
  { name: "maroon", rgb: [128, 0, 0] },
  { name: "orange", rgb: [240, 140, 20] },
  { name: "brown", rgb: [140, 90, 50] },
  { name: "yellow", rgb: [240, 220, 40] },
  { name: "gold", rgb: [212, 175, 55] },
  { name: "green", rgb: [50, 160, 60] },
  { name: "olive", rgb: [128, 128, 0] },
  { name: "teal", rgb: [0, 128, 128] },
  { name: "cyan", rgb: [40, 200, 220] },
  { name: "blue", rgb: [40, 90, 220] },
  { name: "navy", rgb: [0, 0, 110] },
  { name: "purple", rgb: [130, 60, 190] },
  { name: "pink", rgb: [240, 130, 180] },
  { name: "beige", rgb: [225, 210, 175] },
];

function nearestColorName(r: number, g: number, b: number): string {
  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const d =
      (r - c.rgb[0]) ** 2 + (g - c.rgb[1]) ** 2 + (b - c.rgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.name;
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Sample a region of the canvas and return its dominant named color. */
function regionColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.floor(w));
  const sh = Math.max(1, Math.floor(h));
  try {
    const { data } = ctx.getImageData(sx, sy, sw, sh);
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (!n) return "unknown";
    return nearestColorName(r / n, g / n, b / n);
  } catch {
    return "unknown";
  }
}

/** Compute the top dominant colors across the whole image via coarse quantization. */
function dominantColors(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { name: string; hex: string; ratio: number }[] {
  try {
    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    let total = 0;
    for (let i = 0; i < data.length; i += 24) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 125) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const cur = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      cur.count++;
      cur.r += r;
      cur.g += g;
      cur.b += b;
      buckets.set(key, cur);
      total++;
    }
    const arr = Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => {
        const r = c.r / c.count;
        const g = c.g / c.count;
        const b = c.b / c.count;
        return {
          name: nearestColorName(r, g, b),
          hex: toHex(r, g, b),
          ratio: total ? c.count / total : 0,
        };
      });
    // De-duplicate by name keeping the most prominent
    const seen = new Set<string>();
    return arr.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Caption generation (BLIP-like rule-based summary)                          */
/* -------------------------------------------------------------------------- */

function pluralize(label: string, count: number): string {
  if (count === 1) return label;
  if (/(s|x|z|ch|sh)$/.test(label)) return label + "es";
  if (/[^aeiou]y$/.test(label)) return label.slice(0, -1) + "ies";
  return label + "s";
}

function buildCaption(
  detections: Detection[],
  classifications: { label: string; score: number }[],
  colors: { name: string }[]
): string {
  const counts = new Map<string, number>();
  for (const d of detections) counts.set(d.label, (counts.get(d.label) ?? 0) + 1);

  if (counts.size === 0) {
    const top = classifications[0]?.label;
    if (top) {
      return `This looks like an image of ${top.split(",")[0]}.`;
    }
    return "An image with no clearly recognizable objects detected.";
  }

  const parts = Array.from(counts.entries()).map(([label, count]) =>
    count === 1 ? `a ${label}` : `${count} ${pluralize(label, count)}`
  );

  let list: string;
  if (parts.length === 1) list = parts[0];
  else if (parts.length === 2) list = `${parts[0]} and ${parts[1]}`;
  else list = `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;

  const colorHint = colors[0] ? ` The scene is dominated by ${colors[0].name} tones.` : "";
  return `A photo containing ${list}.${colorHint}`;
}

/* -------------------------------------------------------------------------- */
/*  Main analysis pipeline                                                     */
/* -------------------------------------------------------------------------- */

export async function analyzeImage(
  img: HTMLImageElement,
  onProgress?: (msg: string) => void
): Promise<ImageAnalysis> {
  await loadModels(onProgress);
  onProgress?.("Analyzing image…");

  const canvas = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);

  // Object detection
  const raw = await cocoModel!.detect(img, 20);
  const detections: Detection[] = raw
    .filter((d) => d.score >= 0.45)
    .map((d) => ({
      label: d.class,
      score: d.score,
      bbox: d.bbox as [number, number, number, number],
      color: regionColor(ctx, d.bbox[0], d.bbox[1], d.bbox[2], d.bbox[3]),
    }));

  // Classification
  const cls = await mobilenetModel!.classify(img, 5);
  const classifications = cls.map((c) => ({
    label: c.className,
    score: c.probability,
  }));

  const colors = dominantColors(ctx, w, h);
  const caption = buildCaption(detections, classifications, colors);

  return {
    caption,
    detections,
    classifications,
    ocrText: "", // OCR (Tesseract) runs in the backend module; omitted client-side.
    dominantColors: colors,
    width: w,
    height: h,
  };
}

/* -------------------------------------------------------------------------- */
/*  Visual Question Answering (VQA)                                            */
/* -------------------------------------------------------------------------- */

const ANIMALS = new Set([
  "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "bird",
]);
const VEHICLES = new Set([
  "car", "truck", "bus", "motorcycle", "bicycle", "train", "airplane", "boat",
]);

function summarizeObjects(a: ImageAnalysis): string {
  const counts = new Map<string, number>();
  for (const d of a.detections) counts.set(d.label, (counts.get(d.label) ?? 0) + 1);
  if (counts.size === 0) return "I couldn't detect any distinct objects.";
  return Array.from(counts.entries())
    .map(([l, c]) => (c === 1 ? `1 ${l}` : `${c} ${pluralize(l, c)}`))
    .join(", ");
}

/**
 * Answer a natural-language question about the analyzed image.
 * Pure front-end reasoning over the structured analysis results.
 */
export function answerQuestion(question: string, a: ImageAnalysis): string {
  const q = question.toLowerCase().trim();
  const labels = a.detections.map((d) => d.label);
  const counts = new Map<string, number>();
  for (const d of a.detections) counts.set(d.label, (counts.get(d.label) ?? 0) + 1);

  // ---- Greeting / smalltalk ----
  if (/^(hi|hello|hey|yo|sup)\b/.test(q)) {
    return "Hello! I've analyzed your image. Ask me what's in it, how many objects there are, what colors appear, or to describe it in detail.";
  }

  // ---- Detailed description ----
  if (/(describe|detail|tell me about|what.*(happening|going on)|explain)/.test(q)) {
    const lines: string[] = [];
    lines.push(a.caption);
    if (a.detections.length) {
      lines.push(`I detected ${a.detections.length} object${a.detections.length > 1 ? "s" : ""}: ${summarizeObjects(a)}.`);
      const withColor = a.detections
        .filter((d) => d.color && d.color !== "unknown")
        .slice(0, 4)
        .map((d) => `${d.color} ${d.label} (${Math.round(d.score * 100)}%)`);
      if (withColor.length) lines.push(`Notable items: ${withColor.join(", ")}.`);
    }
    if (a.classifications[0]) {
      lines.push(`Overall it most resembles "${a.classifications[0].label}" (${Math.round(a.classifications[0].score * 100)}% confidence).`);
    }
    if (a.dominantColors.length) {
      lines.push(`Dominant colors: ${a.dominantColors.map((c) => c.name).join(", ")}.`);
    }
    return lines.join(" ");
  }

  // ---- Counting ----
  if (/(how many|number of|count)/.test(q)) {
    // people
    if (/(people|persons|person|human|man|men|woman|women|face)/.test(q)) {
      const n = counts.get("person") ?? 0;
      return n === 0
        ? "I don't see any people in this image."
        : `There ${n === 1 ? "is" : "are"} ${n} ${pluralize("person", n)} in the image.`;
    }
    // try to match a detected label mentioned in the question
    for (const [label, n] of counts) {
      if (q.includes(label)) {
        return `I count ${n} ${pluralize(label, n)} in the image.`;
      }
    }
    if (/(object|thing|item)/.test(q)) {
      return `I detected ${a.detections.length} object${a.detections.length === 1 ? "" : "s"} total: ${summarizeObjects(a)}.`;
    }
    return `Across the whole image I detected ${a.detections.length} object${a.detections.length === 1 ? "" : "s"}: ${summarizeObjects(a)}.`;
  }

  // ---- Color questions ----
  if (/colou?r/.test(q)) {
    // color of a specific object
    for (const d of a.detections) {
      if (q.includes(d.label) && d.color && d.color !== "unknown") {
        return `The ${d.label} appears to be ${d.color}.`;
      }
    }
    if (a.dominantColors.length) {
      return `The dominant colors in the image are ${a.dominantColors.map((c) => c.name).join(", ")}.`;
    }
    return "I couldn't reliably determine the colors in this image.";
  }

  // ---- Yes/No "is there a ..." ----
  if (/(is there|are there|do you see|can you see|does.*have|contain)/.test(q)) {
    for (const label of new Set(labels)) {
      if (q.includes(label)) {
        const n = counts.get(label)!;
        return `Yes — I can see ${n} ${pluralize(label, n)} in the image.`;
      }
    }
    if (/(person|people|human)/.test(q)) {
      const n = counts.get("person") ?? 0;
      return n ? `Yes, there ${n === 1 ? "is" : "are"} ${n} ${pluralize("person", n)}.` : "No, I don't see any people.";
    }
    if (/animal/.test(q)) {
      const found = labels.filter((l) => ANIMALS.has(l));
      return found.length ? `Yes, I see: ${Array.from(new Set(found)).join(", ")}.` : "No, I don't detect any animals.";
    }
    if (/(vehicle|car|transport)/.test(q)) {
      const found = labels.filter((l) => VEHICLES.has(l));
      return found.length ? `Yes, I see: ${Array.from(new Set(found)).join(", ")}.` : "No, I don't detect any vehicles.";
    }
    return "I don't see that in the image. Try asking me to describe what I do see.";
  }

  // ---- Category questions ----
  if (/animal/.test(q)) {
    const found = Array.from(new Set(labels.filter((l) => ANIMALS.has(l))));
    return found.length ? `Animals detected: ${found.join(", ")}.` : "I don't detect any animals in this image.";
  }
  if (/(vehicle|car)/.test(q)) {
    const found = Array.from(new Set(labels.filter((l) => VEHICLES.has(l))));
    return found.length ? `Vehicles detected: ${found.join(", ")}.` : "I don't detect any vehicles in this image.";
  }
  if (/(text|read|writ|word|sign|ocr)/.test(q)) {
    return a.ocrText
      ? `The text I can read is: "${a.ocrText}".`
      : "I didn't detect any readable text in this image.";
  }

  // ---- What is in the image / general ----
  if (/(what.*(see|in|image|picture|photo|this)|identify|recognize|objects?)/.test(q)) {
    if (a.detections.length === 0) {
      return `${a.caption} ${a.classifications[0] ? `It most resembles "${a.classifications[0].label}".` : ""}`.trim();
    }
    return `${a.caption} Detected objects: ${summarizeObjects(a)}.`;
  }

  // ---- Confidence ----
  if (/(confiden|sure|accura|probab)/.test(q)) {
    if (!a.detections.length) return "I have no object detections to report confidence for.";
    return a.detections
      .map((d) => `${d.label}: ${Math.round(d.score * 100)}%`)
      .join(", ");
  }

  // ---- Fallback ----
  return `${a.caption} You can ask me things like "What is in this image?", "How many people are there?", "What color is the ${labels[0] ?? "object"}?", or "Describe this image in detail."`;
}
