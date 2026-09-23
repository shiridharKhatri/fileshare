# VPS Deployment Guide: Temporary Shared File & Message Room

This document outlines the step-by-step instructions for deploying the Temporary Shared File & Message Room application on a Linux VPS (Ubuntu 22.04 / 24.04 LTS).

---

## 1. Architecture Summary

* **Frontend & API**: Next.js App Router (Node.js runtime)
* **Custom Server**: `server.ts` compiled to `server.js` running HTTP + Socket.io + Cron cleanup
* **File Storage**: Local filesystem (`./storage/rooms/{roomId}/`) with Multer disk storage — **Zero cloud storage dependencies**
* **Database**: MongoDB (local or managed instance)
* **Process Manager**: PM2
* **Reverse Proxy**: Nginx with WebSocket upgrade and streaming support

---

## 2. Server Prerequisites

### 2.1 System Updates & Essentials
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx
```

### 2.2 Install Node.js 22 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2.3 Install MongoDB
You can run MongoDB locally via system packages or Docker:

#### Option A: Native MongoDB (Recommended for VPS)
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
```

#### Option B: Docker Compose
```bash
docker compose up -d
```

---

## 3. Application Setup

### 3.1 Clone & Install Dependencies
```bash
sudo mkdir -p /var/www/filesharing
sudo chown -R $USER:$USER /var/www/filesharing
cd /var/www/filesharing

# Clone repository
git clone <your-repo-url> .

# Install dependencies
npm ci
```

### 3.2 Configure Environment Variables
Create `/var/www/filesharing/.env.local`:
```bash
cp .env.example .env.local # or nano .env.local
```

Example `.env.local`:
```env
# Application
PORT=3000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/filesharing

# Security (Generate a secure 64-char key: openssl rand -hex 32)
JWT_SECRET=replace_with_a_very_secure_random_string_at_least_32_chars_long

# Storage
UPLOAD_DIR=/var/www/filesharing/storage
MAX_FILE_SIZE_MB=5000
MAX_FILES_PER_ROOM=100
MAX_ROOM_STORAGE_MB=10000

# Cleanup & Expiration
DEFAULT_ROOM_EXPIRATION_HOURS=18
CLEANUP_INTERVAL_MINUTES=15

# Rate Limiting
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_WINDOW_MS=900000
```

### 3.3 Storage Permissions
```bash
mkdir -p /var/www/filesharing/storage/rooms
chmod -R 750 /var/www/filesharing/storage
```

---

## 4. Build & Run with PM2

### 4.1 Build
```bash
npm run build
```
This builds both the Next.js application and compiles `server.ts` to `server.js`.

### 4.2 Start via PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

To manage the app:
* `pm2 status` — View status
* `pm2 logs filesharing` — View real-time logs
* `pm2 restart filesharing` — Restart process

---

## 5. Nginx & SSL Configuration

### 5.1 Configure Nginx
Copy `nginx.conf.example` to sites-available:
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/filesharing
```
Edit `/etc/nginx/sites-available/filesharing` to replace `share.example.com` with your real domain.

Enable the site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/filesharing /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.2 Obtain SSL Certificate via Let's Encrypt
```bash
sudo certbot --nginx -d share.example.com
```

---

## 6. UFW Firewall Setup

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 7. Storage & Expiration Maintenance

* The server runs an automatic cleanup worker every 15 minutes (`CLEANUP_INTERVAL_MINUTES`).
* Expired rooms have their physical files removed from the filesystem and their records in MongoDB purged.
* Orphaned files without an active database room record are automatically deleted.
* All uploads are constrained by filesystem permissions and disk quotas.
