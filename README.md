# Temporary Shared File & Message Room

A production-ready temporary file-sharing web application inspired by the simplicity of WeTransfer, built for exchanging files and rich-text messages through ephemeral rooms.

**Core Concept:**
> **One URL → 4-digit code → shared room → upload/download files + rich-text messages → automatic deletion.**

---

## Features

- **Ephemeral Rooms**: Create rooms identified by URL-safe slugs (e.g., `AB-12-CD`) with an expiration period (10h, 18h, or 24h).
- **4-Digit Passcode Protection**: Bcrypt-hashed room access codes with sliding-window brute-force rate limiting (5 attempts per 15 min).
- **Direct VPS File Storage**: Zero cloud storage (no S3, R2, or third-party buckets). All files stream directly to and from the server's filesystem using **Multer**.
- **Real-Time Synchronization**: Live file and message updates across all room participants via **Socket.io** WebSocket events.
- **Rich-Text Messaging**: Tiptap editor with headings, bold, italic, underline, lists, and links, backed by strict server-side DOMPurify sanitization.
- **Automated Lifecycle & Cleanup**: Background scheduler cleans up expired rooms, unlinks files from disk, and purges database records automatically.
- **Security Hardening**:
  - Sandboxed filesystem operations with path traversal prevention.
  - IDOR protection verifying room ownership on all file/message endpoints.
  - Streaming file downloads with sanitized `Content-Disposition` headers.
  - Strict Content Security Policy, nosniff, and anti-clickjacking headers.
  - `robots.txt` disallowing search engine indexing of room URLs.

---

## Technology Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose
- **File Uploads**: Multer disk storage (VPS filesystem)
- **Real-time**: Socket.io (custom Node.js server)
- **Editor**: Tiptap 3 (`@tiptap/react`)
- **Sanitization**: DOMPurify & `isomorphic-dompurify`
- **Security & Validation**: Zod, Jose (JWT), Bcrypt

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
- MongoDB instance (or Docker)

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Local MongoDB
Using Docker Compose:
```bash
docker compose up -d
```
Or use your own local/cloud MongoDB connection string.

### 4. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env.local
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

```bash
# Run unit & security tests (27 tests)
npm test

# TypeScript type check
npm run type-check

# ESLint audit
npm run lint

# Production build
npm run build
```

---

## Deployment

This application uses a custom Node.js server with Socket.io and local filesystem storage, designed specifically for a **Linux VPS** (Ubuntu/Debian) managed via **PM2** and **Nginx**.

For complete step-by-step VPS deployment, SSL setup, and system configuration instructions, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.
