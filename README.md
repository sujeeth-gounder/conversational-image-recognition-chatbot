# 🖼️💬 VisionChat — Conversational Image Recognition Chatbot

An AI-powered chatbot that analyzes uploaded images and answers natural-language
questions about them in a conversational, ChatGPT-style interface.

> **This repository ships a fully-functional React front-end that performs real,
> on-device image recognition using TensorFlow.js**, plus a complete **reference
> Flask + MySQL backend** (in `backend/` and `database/`) that mirrors the same
> data model and REST API for production deployment.

---

## ✨ Features

| Area | Capabilities |
|------|--------------|
| **Authentication** | Register / Login, secure password hashing (SHA-256 + salt client-side / bcrypt server-side), JWT sessions, profile management |
| **Image Upload** | JPG / JPEG / PNG, drag-and-drop, instant preview, validation (type + 8 MB limit) |
| **Image Recognition** | Object detection (80+ classes), image captioning, scene classification, per-object + whole-image color analysis, confidence scores |
| **Conversational Chat** | ChatGPT-like UI, persistent conversation history per image, suggested prompts, typing indicator |
| **Visual Q&A** | "What is in this image?", "How many people are there?", "What color is the car?", "Describe this image in detail.", yes/no & category questions |
| **Dashboard** | Previous analyses, per-image stats, usage statistics |
| **Admin Panel** | View users, monitor usage, moderate/delete users, images & chat logs |
| **UX** | Responsive design, **dark / light mode**, loading indicators, robust error handling |

---

## 🧠 AI Module

The browser build runs the vision stack **entirely on-device** (no server round-trip):

| Capability | Browser implementation | Backend equivalent |
|------------|------------------------|--------------------|
| Object Detection | TensorFlow.js **COCO-SSD** | **YOLOv8** (Ultralytics) |
| Image Captioning | Rule-based generator over detections | **BLIP** (Transformers) |
| Classification | TensorFlow.js **MobileNet v2** | timm / torchvision |
| Color Analysis | Canvas pixel sampling + quantization | **OpenCV** |
| OCR | Hook (backend module) | **Tesseract OCR** |
| Visual Q&A | NL reasoning over structured results | **BLIP-VQA / ViLT** |

---

## 🚀 Front-end — Quick Start

```bash
npm install
npm run dev      # start dev server
npm run build    # production build -> dist/index.html
```

Open the app, then **Register** a new account, or use the seeded demo admin:

```
Email:    admin@visionchat.ai
Password: admin123
```

> On first analysis the TFJS models (~10 MB) download from Google's CDN and are
> cached. All subsequent analyses run instantly on your device.

### Front-end tech
- **React 19** + **TypeScript**
- **Vite 7** build tooling
- **Tailwind CSS v4**
- **react-router-dom** (HashRouter)
- **TensorFlow.js** (`coco-ssd`, `mobilenet`)

### Persistence
The front-end uses a localStorage-backed data layer (`src/lib/db.ts`) that emulates
the MySQL schema (Users, Images, ChatHistory). Swap this module for `fetch()` calls
to the Flask API to go full-stack — the data shapes are identical.

---

## 🗂️ Project Structure

```
Conversational-Image-Recognition-Chatbot/
├── src/                         # React front-end
│   ├── components/              # Navbar, Layout, ImageUploader, Icons, guards
│   ├── lib/                     # auth, theme, db (data layer), vision (AI module)
│   ├── pages/                   # Home, Login, Register, Dashboard, Chat, Profile, Admin
│   └── App.tsx                  # Router + providers
├── backend/                     # Reference Flask REST API
│   ├── app.py                   # App factory + routes
│   ├── models.py                # SQLAlchemy models
│   ├── ai/                      # AI modules (detection, caption, ocr, vqa)
│   └── requirements.txt
├── database/
│   └── schema.sql               # MySQL schema (Users, Images, ChatHistory, Admin)
├── documentation/
│   └── API.md                   # REST API reference
└── README.md
```

---

## 🔌 REST API (reference backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Create a user account |
| `POST` | `/login` | Authenticate, returns JWT |
| `POST` | `/upload-image` | Upload + analyze an image (multipart) |
| `POST` | `/chat` | Ask a question about an analyzed image |
| `GET`  | `/history` | Fetch the user's image + chat history |

Full request/response details: [`documentation/API.md`](documentation/API.md).

---

## 🛡️ Security
- Passwords are never stored in plaintext (hashed + salted).
- JWT-protected routes; admin-only routes guarded both client and server side.
- Image upload validation (MIME type + size) on client and server.

---

## 🔮 Future Enhancements
- Real-time webcam capture & live detection
- BLIP / GPT-4o vision integration for richer captioning & open-ended VQA
- Multi-image conversations & comparison
- Export chat transcripts (PDF / Markdown)
- Team workspaces & sharing
- Rate limiting, audit logging & content-moderation queue for admins
- Cloud object storage (S3) for uploaded images

---

## 📄 License
MIT — built for educational/demo purposes.
