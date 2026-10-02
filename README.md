# Barber Shop Appointment Management System (BSMS)

A modern, production-grade full-stack appointment booking and chair management system built for barber shops and grooming lounges.

---

## 🌟 Architecture Overview

```text
Customer / Barber / Admin
            |
            v
     React 19 Frontend (Vite + Tailwind CSS + PWA)
            |
            | HTTPS REST API (JSON / JWT)
            v
    Node.js + Express + TypeScript Backend
            |
            v
     Application Services & Middleware (Zod Validation + RBAC)
            |
            v
       Prisma ORM
            |
            v
       PostgreSQL Database (Docker / VPS)
```

---

## 👥 Supported Roles & Portals

1. **`CUSTOMER`**:
   - Service catalog with durations & prices in ETB.
   - 5-step appointment booking wizard with real-time slot conflict detection.
   - Self-service cancellation and safe rescheduling.
   - Profile management and profile photo upload.
   - In-app notification feed.

2. **`BARBER`**:
   - Live chair workstation queue with status transitions: Check-in, Start, Complete, Mark Late, Mark No-show.
   - Walk-in client quick-booking form.
   - Master chair schedule timeline with date & status filters.

3. **`ADMIN`**:
   - Financial KPI dashboard (Gross revenue, online payments, shop cash, cancellation rates).
   - Barber staff management & weekly shift assignment.
   - Service catalog management (pricing, duration, active status).
   - Global shop operating hours configuration.
   - Appointments oversight and overrides.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20 or v22 LTS
- **PostgreSQL**: Local instance or Docker container

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env

# Generate Prisma Client & Migrate Database
npx prisma generate
npx prisma db push
npm run prisma:seed

# Start Backend Dev Server (Port 5000)
npm run dev
```

### 3. Frontend Setup
```bash
# In the root directory
npm install

# Start Frontend Dev Server (Port 5173)
npm run dev
```

### 4. Default Seed Accounts (For Testing)
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@barbershop.com` | `Admin123!` |
| **Barber** | `barber@barbershop.com` | `Barber123!` |
| **Customer** | `customer@barbershop.com` | `Customer123!` |

---

## 🐳 Docker Deployment

To spin up PostgreSQL, the Express backend, and the React frontend with Nginx in a single command:

```bash
docker compose up --build -d
```

- **Frontend App**: `http://localhost`
- **Backend API**: `http://localhost:5000/api/health`
- **PostgreSQL**: `localhost:5432`

---

## 🧪 Testing

Run backend unit and integration test suite:
```bash
cd backend
npm test
```

Run frontend production build verification:
```bash
npm run build
```

---

## 🌐 Production Deployment (Contabo VPS + Namecheap)

See [DEPLOYMENT.md](file:///c:/Users/Siraj/Desktop/BSMS/DEPLOYMENT.md) for full instructions on setting up DNS, Docker, Nginx, and free SSL certificates with Let's Encrypt Certbot on a Contabo VPS.
