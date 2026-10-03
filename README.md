# Barber Shop Management System (BSMS) — Multi-Tenant SaaS Platform

A modern, production-grade **Multi-Tenant SaaS Barber Shop & Salon Management Platform** built with React 19, Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

BSMS allows platform operators to provision, manage, and scale independent barber shops on dedicated subdomains (e.g. `crownandblade.bsms.com`, `downtowncuts.bsms.com`) with full data isolation, tiered subscription billing, and rich white-label branding.

---

## 🌟 Architecture & Multi-Tenant SaaS Design

```text
       Platform Visitors & Clients
                   |
     +-------------+-------------+
     |                           |
     v                           v
Platform Portal            Tenant Subdomain
(app.bsms.com)       (crownandblade.bsms.com)
     |                           |
     +-------------+-------------+
                   |
                   v
     React 19 Frontend (Vite + Tailwind CSS + PWA)
     - TenantContext (subdomain resolution & dynamic branding)
     - RoleGuard & PlatformGuard
                   |
                   | HTTP REST API (JWT + Subdomain / x-tenant-slug Header)
                   v
     Node.js + Express + TypeScript Backend
     - resolveTenant Middleware (Host header & slug routing)
     - requireRole & requireSuperAdmin Middleware
     - Tenant-isolated Services & Controllers
     - Global Audit Trail Engine
                   |
                   v
               Prisma ORM
                   |
                   v
     PostgreSQL Database (Shared Database with Tenant Isolation & Compound Indexes)
```

---

## 👥 Supported Roles & SaaS Portals

### 1. 👑 `SUPER_ADMIN` (Platform Management Portal — `/platform/*`)
- **Global Overview**: Platform-wide metrics (total tenants, active subscriptions, total system users, gross appointments & volume).
- **Business Management**: Provision new tenant shops with initial owner credentials, suspend delinquent shops, or archive shops.
- **Subscription Plans**: Configure SaaS plans (`Starter`, `Pro`, `Enterprise`), pricing in ETB, barber chair limits, monthly booking caps, and feature entitlements.
- **User Directory**: Search and manage all platform accounts and tenant memberships.
- **Global Audit Trail**: Immutable ledger of all platform administrative actions, tenant status transitions, and security events.

### 2. 🏬 `SHOP_OWNER` & `MANAGER` (Shop Administration — `/admin/*`)
- **Financial Analytics**: Shop-level gross revenue, online vs. cash payment breakdown, chair utilization, and cancellation rates.
- **Barber Staff & Schedules**: Manage barber profiles, weekly working hours, and chair assignments.
- **Service Catalog**: Manage grooming services, pricing in ETB, and duration.
- **Shop Branding & Policies**: Configure shop display name, contact information, theme accent colors, notice hours, and walk-in settings (`/admin/settings`).

### 3. ✂️ `BARBER` (Workstation Terminal — `/barber/*`)
- **Live Chair Queue**: Real-time appointment queue with status updates (Check-In, Start, Complete, Mark Late, Mark No-Show).
- **Walk-in Booking**: Quick counter registration and instant slot booking for walk-in clients.
- **Master Schedule**: Daily and weekly chair timetable with status filters.

### 4. 👤 `CUSTOMER` (Client Portal — `/customer/*`)
- **Public / Subdomain Booking**: Dynamic branded booking experience tailored to the specific shop.
- **5-Step Booking Wizard**: Real-time slot conflict prevention, duration-based calculation, and barber selection.
- **Self-Service Rescheduling & Cancellations**: Subject to the shop's cutoff policies.
- **Profile & In-App Notifications**: Real-time booking alerts, status updates, and reminders.

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

# Generate Prisma Client & Run Multi-Tenant Seed
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

### 4. Demo Accounts & SaaS Roles
| Role | Email | Password | Scope |
|---|---|---|---|
| **👑 Super Admin** | `superadmin@bsms.com` | `SuperAdmin123!` | Platform-Wide |
| **🏬 Shop Owner** | `owner@crownandblade.com` | `Owner123!` | Crown & Blade (`demo-shop`) |
| **🏬 Secondary Owner** | `owner@downtowncuts.com` | `Owner123!` | Downtown Cuts (`downtown-cuts`) |
| **✂️ Barber** | `barber@barbershop.com` | `Barber123!` | Crown & Blade (`demo-shop`) |
| **👤 Customer** | `customer@barbershop.com` | `Customer123!` | Crown & Blade (`demo-shop`) |

---

## 🧪 Testing & Verification

Run the comprehensive multi-tenant isolation, RBAC, and availability test suite:
```bash
cd backend
npm test
```

Test production frontend compilation:
```bash
npm run build
```

---

## 🐳 Docker Multi-Tenant Deployment

Launch the complete SaaS stack with PostgreSQL, Express backend, and React frontend routed via Nginx:

```bash
docker compose up --build -d
```

- **Frontend App**: `http://localhost` (or `http://demo-shop.localhost`)
- **Backend API**: `http://localhost:5000/api/health`
- **PostgreSQL**: `localhost:5432`

---

## 🌐 Production Deployment (Contabo VPS + Namecheap)

See [DEPLOYMENT.md](file:///c:/Users/Siraj/Desktop/BSMS/DEPLOYMENT.md) for full instructions on setting up Wildcard DNS (`*.yourdomain.com`), Wildcard SSL certificates with Let's Encrypt Certbot, Nginx reverse proxy, and automated database backups.
