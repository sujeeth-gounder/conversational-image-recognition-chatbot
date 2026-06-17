"""
ai/vision.py — AI Vision Module
-------------------------------------------------------------------------------
Wraps the heavy vision models behind a simple interface:

    analyze_image(path) -> dict   # detection + caption + colors + ocr
    answer_question(question, analysis) -> str   # Visual Q&A

Models are loaded lazily on first use:
  - Object detection : YOLOv8  (ultralytics)
  - Captioning + VQA : BLIP    (transformers)
  - OCR              : Tesseract (pytesseract)
  - Color analysis   : OpenCV + numpy
-------------------------------------------------------------------------------
"""
from functools import lru_cache

import cv2
import numpy as np


# --------------------------------------------------------------------------- #
#  Lazy model loaders                                                          #
# --------------------------------------------------------------------------- #
@lru_cache(maxsize=1)
def _yolo():
    from ultralytics import YOLO
    return YOLO("yolov8n.pt")  # nano model; swap for s/m/l/x for accuracy


@lru_cache(maxsize=1)
def _blip_caption():
    from transformers import BlipProcessor, BlipForConditionalGeneration
    proc = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    model = BlipForConditionalGeneration.from_pretrained(
        "Salesforce/blip-image-captioning-base"
    )
    return proc, model


@lru_cache(maxsize=1)
def _blip_vqa():
    from transformers import BlipProcessor, BlipForQuestionAnswering
    proc = BlipProcessor.from_pretrained("Salesforce/blip-vqa-base")
    model = BlipForQuestionAnswering.from_pretrained("Salesforce/blip-vqa-base")
    return proc, model


# --------------------------------------------------------------------------- #
#  Helpers                                                                     #
# --------------------------------------------------------------------------- #
def _dominant_colors(img_bgr, k: int = 5):
    """Quantize pixels with k-means and return dominant colors."""
    data = img_bgr.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, labels, centers = cv2.kmeans(data, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten())
    out = []
    for i in np.argsort(counts)[::-1]:
        b, g, r = centers[i]
        out.append(
            {
                "hex": "#%02x%02x%02x" % (int(r), int(g), int(b)),
                "ratio": float(counts[i] / counts.sum()),
            }
        )
    return out


def _ocr(img_bgr) -> str:
    import pytesseract
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    return pytesseract.image_to_string(gray).strip()


# --------------------------------------------------------------------------- #
#  Public API                                                                 #
# --------------------------------------------------------------------------- #
def analyze_image(path: str) -> dict:
    img = cv2.imread(path)
    h, w = img.shape[:2]

    # ---- Object detection (YOLOv8) ----
    results = _yolo()(path, verbose=False)[0]
    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        detections.append(
            {
                "label": results.names[cls_id],
                "score": float(box.conf[0]),
                "bbox": [x1, y1, x2 - x1, y2 - y1],
            }
        )

    # ---- Caption (BLIP) ----
    from PIL import Image as PILImage
    pil = PILImage.open(path).convert("RGB")
    proc, model = _blip_caption()
    inputs = proc(pil, return_tensors="pt")
    caption = proc.decode(model.generate(**inputs)[0], skip_special_tokens=True)

    return {
        "caption": caption,
        "detections": detections,
        "dominantColors": _dominant_colors(img),
        "ocrText": _ocr(img),
        "width": w,
        "height": h,
    }


def answer_question(question: str, analysis: dict) -> str:
    """
    For production, route to BLIP-VQA for open-ended answers. A rule-based
    fallback over the structured `analysis` keeps latency low for common queries
    (counts, colors, "what is in this image"). See src/lib/vision.ts for the
    mirrored front-end implementation of that reasoning.
    """
    proc, model = _blip_vqa()
    # ... load the original image, run VQA, return decoded answer ...
    raise NotImplementedError("Wire up BLIP-VQA inference here.")
