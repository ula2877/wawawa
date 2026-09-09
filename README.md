# WhatsApp Blast Dashboard

A full-stack WhatsApp broadcast (blast) management dashboard. Plan, schedule, review, and send bulk WhatsApp campaigns, manage message templates, connected WhatsApp accounts, delivery queue and logs, analytics, reports, team collaborators, and activity history — all behind a single web UI.

---

## Project Structure

```
WA_BLAST/
├── src/                    # Frontend source code (React + TypeScript)
│   ├── components/         # UI and domain components
│   ├── pages/              # Page components (route-based)
│   ├── services/           # API service layer
│   ├── store/              # Zustand state stores
│   ├── layouts/            # Sidebar, Topbar, MainLayout
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper utilities
├── backend/                # NestJS backend (active API server)
│   ├── src/                # Backend source code
│   ├── prisma/             # Prisma schema and migrations
│   └── storage/            # Runtime storage (sessions, media)
├── laravel_backend/        # Legacy Laravel backend (deprecated)
├── public/                 # Static assets
└── dist/                   # Frontend build output
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5 | Build tooling |
| Tailwind CSS | 3 | Styling (light & dark mode) |
| React Router | 6 | Client-side routing |
| Zustand | 4 | State management |
| Recharts | 2 | Analytics charts |
| react-hook-form + zod | — | Form handling & validation |
| socket.io-client | 4 | Real-time WhatsApp events |
| lucide-react | — | Icons |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 24 | Runtime |
| NestJS | 12 | API framework |
| Prisma | 7 | ORM |
| MariaDB | — | Database |
| Baileys | 7 (rc) | WhatsApp Web integration |
| Passport + JWT | — | Authentication |
| Socket.IO | 4 | Real-time events |

---

## Prerequisites

- **Node.js** 18+ (recommended: 24)
- **npm** 9+
- **MariaDB** or **MySQL** running locally

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/ula2877/wawawa.git
cd wawawa
```

### 2. Frontend setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` if needed (default API URL is `http://localhost:3000/api`).

### 3. Backend setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `backend/.env` and configure your database connection and other settings.

### 4. Database setup

```bash
cd backend

# Push database schema
npx prisma db push

# Seed initial data (creates default users)
npx prisma db seed

# Generate Prisma client
npx prisma generate
```

### 5. Laravel Backend (Legacy)

The `laravel_backend/` directory contains a legacy Laravel API. It is no longer actively used but is preserved for reference.

```bash
cd laravel_backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database in .env, then run migrations
php artisan migrate
```

---

## Running the Application

### Frontend

```bash
# From root directory
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Type-check + production build
npm run preview    # Preview the production build
```

### Backend

```bash
cd backend

npm run start:dev  # Start NestJS in watch mode (http://localhost:3000)
npm run start:prod # Start production build
```

The backend serves the API at `http://localhost:3000/api`.

---

## Environment Variables

### Frontend (`.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` |

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MySQL/MariaDB connection string | `mysql://root:@localhost:3306/wa_blast` |
| `PORT` | Backend server port | `3000` |
| `JWT_SECRET` | Secret for signing JWT tokens | _(must be set)_ |
| `JWT_EXPIRES_IN` | JWT token expiration | `12h` |
| `WHATSAPP_SESSION_DIR` | Baileys session storage path | `storage/whatsapp-sessions` |
| `MEDIA_UPLOAD_DIR` | Campaign attachment storage path | `storage/campaign-media` |
| `WHATSAPP_WORKER_CONCURRENCY` | Max concurrent message sends | `1` |
| `WHATSAPP_PROCESSING_TIMEOUT_SECONDS` | Stale processing timeout | `300` |
| `WHATSAPP_MAX_MESSAGE_ATTEMPTS` | Max retry attempts per message | `3` |
| `WHATSAPP_TYPING_ENABLED` | Show typing indicator before send | `1` |
| `WHATSAPP_MESSAGE_DELAY_MIN_MS` | Min delay between messages | `1500` |
| `WHATSAPP_MESSAGE_DELAY_MAX_MS` | Max delay between messages | `4000` |

---

## Feature Overview

| Module | Description |
|---|---|
| **Dashboard** | Overview stats, recent campaigns, quick actions, and activity feed. |
| **Campaigns** | Create (wizard), edit, schedule, pause/resume, duplicate, send now, and delete broadcast campaigns with live WhatsApp preview and variable substitution. |
| **Templates** | Manage WhatsApp message templates with variable support (`{{name}}`, `{{idpel}}`, etc.), category, language, and live preview. |
| **Contacts** | CRUD contacts with PLN customer fields (IDPEL, tariff, power, region, ULP), CSV import, contact groups. |
| **Contact Groups** | Organize contacts into named groups with color coding and member management. |
| **WhatsApp Accounts** | Connect/disconnect sender accounts via QR code, set default sender, manage sessions. |
| **Message Queue** | Monitor queued outgoing messages; cancel or retry individual items. |
| **Message Logs** | Filter and inspect the delivery history of sent messages with detailed status tracking. |
| **Analytics** | Charts and tables for delivery rates, read rates, top campaigns, and sender performance. |
| **Reports** | Generate and export campaign, delivery, contact, and sender reports (PDF and CSV). |
| **Team** | Manage collaborators, assign roles (Admin/Operator), enable/disable accounts. |
| **Activity Logs** | Filterable, grouped-by-day audit trail of workspace actions. |
| **Settings** | Workspace general, WhatsApp, notification, security, and billing/usage preferences. |
| **Profile** | Edit personal information and change password. |

---

## WhatsApp Account Setup

1. Navigate to **WhatsApp Accounts** in the sidebar.
2. Click **Add Account** and provide a name.
3. Click **Connect** on the new account card.
4. Scan the displayed QR code using WhatsApp on your phone:
   - Open WhatsApp > Settings > Linked Devices > Link a Device.
5. The account status will change to **Connected** once scanning is complete.
6. Set the account as **Default** to use it automatically for campaigns.

---

## Default User Accounts (Seed Data)

After running `npx prisma db seed`, the following accounts are created:

| Role | Email | Password |
|---|---|---|
| Owner (superadmin) | `superadmin@example.com` | `password` |
| Admin | `admin@example.com` | `password` |

> **Important:** Change these credentials before deploying to production.

---

## License

Private project. All rights reserved.
