# Production Deployment Guide: Contabo VPS & Namecheap

This step-by-step guide walks you through deploying the **Barber Shop Appointment Management System** to a Contabo VPS with a custom domain managed by Namecheap.

---

## 1. Namecheap DNS Configuration

In your **Namecheap Dashboard** $\rightarrow$ **Domain List** $\rightarrow$ **Advanced DNS**, add the following **A Records** pointing to your Contabo VPS Public IP Address (e.g. `198.51.100.25`):

| Type | Host | Value | TTL |
|---|---|---|---|
| **A Record** | `@` | `<YOUR_CONTABO_VPS_IP>` | Automatic (or 5 min) |
| **A Record** | `www` | `<YOUR_CONTABO_VPS_IP>` | Automatic (or 5 min) |
| **A Record** | `api` | `<YOUR_CONTABO_VPS_IP>` | Automatic (or 5 min) |

*DNS propagation usually takes between 5 to 30 minutes.*

---

## 2. Contabo VPS Initial Server Setup

Connect to your VPS via SSH:
```bash
ssh root@<YOUR_CONTABO_VPS_IP>
```

### Update System Packages & Install Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# Install Docker Engine & Docker Compose Plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Configure Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh       # Port 22
sudo ufw allow http      # Port 80
sudo ufw allow https     # Port 443
sudo ufw enable
```

---

## 3. Clone Repository & Configure Environment

```bash
# Clone the repository
git clone https://github.com/<your-username>/BSMS.git /var/www/bsms
cd /var/www/bsms

# Configure Backend Production Environment
cp backend/.env.example backend/.env
nano backend/.env
```

Set strong production values in `backend/.env`:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_STRONG_DB_PASSWORD@postgres:5432/barber_shop_db?schema=public
JWT_SECRET=YOUR_RANDOM_64_CHARACTER_PRODUCTION_SECRET
FRONTEND_URL=https://yourdomain.com
UPLOAD_DIR=uploads
```

---

## 4. Run Application with Docker Compose

```bash
# Launch containers in background
docker compose up --build -d

# Run Prisma Database Migrations and Production Seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

---

## 5. Setup SSL / HTTPS with Let's Encrypt Certbot

You can configure Certbot on the host to manage automatic SSL renewals:

```bash
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL Certificate for your domains
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## 6. Database Backups & Recovery Plan

Create an automated daily backup cron job:

```bash
# Create backup script
mkdir -p /var/backups/bsms
nano /var/backups/bsms/backup.sh
```

Add the backup script:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/bsms"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec -t bsms_postgres pg_dumpall -c -U postgres > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +14 -delete
```

Make executable and add to crontab:
```bash
chmod +x /var/backups/bsms/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /var/backups/bsms/backup.sh") | crontab -
```

---

## 7. Zero-Downtime Updates

When pushing updates to GitHub:

```bash
cd /var/www/bsms
git pull origin main
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
```
