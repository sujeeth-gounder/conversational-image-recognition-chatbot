# VisionChat REST API Reference

Base URL: `http://localhost:5000`
All authenticated endpoints require an `Authorization: Bearer <JWT>` header.

---

## POST `/register`
Create a new user account.

**Request**
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }
```
**Response `201`**
```json
{
  "token": "<jwt>",
  "user": { "id": "usr_...", "name": "Jane Doe", "email": "jane@example.com", "role": "user" }
}
```
**Errors:** `400` validation, `409` email already registered.

---

## POST `/login`
Authenticate and receive a JWT.

**Request**
```json
{ "email": "jane@example.com", "password": "secret123" }
```
**Response `200`**
```json
{ "token": "<jwt>", "user": { "id": "usr_...", "name": "Jane Doe", "role": "user" } }
```
**Errors:** `401` invalid credentials.

---

## POST `/upload-image`
Upload an image and run the full AI analysis pipeline.

**Request:** `multipart/form-data`
| Field | Type | Notes |
|-------|------|-------|
| `image` | file | JPG / JPEG / PNG, ≤ 8 MB |

**Response `201`**
```json
{
  "id": "img_...",
  "name": "street.jpg",
  "caption": "A photo containing 3 people and a car. The scene is dominated by gray tones.",
  "analysis": {
    "detections": [
      { "label": "person", "score": 0.94, "bbox": [12, 40, 80, 220], "color": "blue" }
    ],
    "classifications": [ { "label": "sports car", "score": 0.61 } ],
    "dominantColors": [ { "name": "gray", "hex": "#9aa0a6", "ratio": 0.34 } ],
    "ocrText": "",
    "width": 1280,
    "height": 720
  }
}
```
**Errors:** `400` invalid file, `401` unauthorized.

---

## POST `/chat`
Ask a natural-language question about a previously analyzed image (Visual Q&A).

**Request**
```json
{ "imageId": "img_...", "message": "How many people are there?" }
```
**Response `200`**
```json
{
  "reply": "There are 3 people in the image.",
  "messageId": "msg_..."
}
```
**Errors:** `404` image not found, `401` unauthorized.

---

## GET `/history`
Return the authenticated user's images and chat messages.

**Response `200`**
```json
{
  "images": [ { "id": "img_...", "name": "street.jpg", "caption": "...", "createdAt": 1730000000000 } ],
  "chat":   [ { "id": "msg_...", "imageId": "img_...", "role": "user", "text": "...", "createdAt": 1730000000000 } ]
}
```

---

## Admin (admin role required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/admin/users` | List all users |
| `DELETE` | `/admin/users/:id` | Delete a user + their data |
| `DELETE` | `/admin/images/:id` | Delete an image |
| `DELETE` | `/admin/chat/:id` | Delete a chat message |
| `GET`    | `/admin/stats` | Aggregate usage statistics |
