# PSYS — Smart Multi-Tenant Automated Attendance & Verification System

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![InsightFace](https://img.shields.io/badge/InsightFace-ArcFace%20512--D-FF6F00?style=for-the-badge)](https://github.com/deepinsight/insightface)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Backend on Render](https://img.shields.io/badge/Render-Active-46E3B7?style=for-the-badge&logo=render)](https://render.com/)

> **An enterprise-grade, multi-tenant automated classroom attendance platform powered by computer vision, quorum-based session boundary detection, and privacy-first biometric verification.** Eliminates proxy attendance and manual roll-calls with zero routine teacher friction.

---

## 🚀 Live Demo & Access

- **Web Application Portal**: [Deployed on Vercel](#deployment-guide) (or visit your custom deployment)
- **Camera & AI Microservice**: [`https://psys-camera-service.onrender.com`](https://psys-camera-service.onrender.com) (`/health` status: `ok`)
- **Interactive Persona Access**:

The application includes built-in 1-click credential auto-fill on the `/login` page for fast portfolio demonstration:

| Role | Email | Password | Persona Permissions & View |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@test.local` | `demoPassword123!` | Institution settings, camera streams, student enrollments, bulk CSV import, audit logs. |
| **Teacher** | `teacher@test.local` | `demoPassword123!` | Class timetables, live session monitoring, permitted exits, attendance finalization, dispute review. |
| **Student** | `student@test.local` | `demoPassword123!` | Personal attendance records, presence score stats, dispute filing with evidence attachments. |

---

## ⚡ Problem Statement & Engineering Solution

### The Challenge
1. **Proxy Attendance & Roll-Call Overhead**: Traditional attendance takes 10–15% of class time and suffers from buddy-punching, unauthorized roll calls, and paper forgery.
2. **Hardware Bottlenecks**: Scanning 60+ students at the classroom door creates hallway congestion and delay.
3. **Flawed "Single-Frame" Face Recognition**: Direct face recognition without context leads to false positives, ignores camera degradation, and causes wrongful absences when students have permitted leaves.
4. **Privacy Regulations**: Retaining thousands of raw face photos of students violates international and institutional biometric privacy guidelines (GDPR, FERPA).

### The PSYS Solution
- **Two-Stage Candidate Shrinking**: Integrates with campus entry gates (turnstiles/RFID) so that during any class session, facial matching is strictly scoped to the expected roster rather than thousands of campus students (`derive_session_roster()`).
- **Autonomous Quorum Boundaries**: Actual session start/end timestamps are dynamically computed by clustering observation densities across the classroom, resilient to late professors or early completions.
- **Privacy-by-Design**: Enrollment photos are converted to normalized ArcFace 512-D embeddings; raw photos are immediately deleted from storage upon vector persistence.
- **Context-Aware Gap Analysis**: Distinguishes between genuine absences, hardware/camera degradation windows, and teacher-approved permitted exits (e.g. medical emergencies).

---

## 🏗️ Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (Vercel)                           │
│   Next.js 16 App Router  ·  React 19  ·  TypeScript  ·  Tailwind CSS v4    │
│   ├── Admin Console (/students, /cameras, /settings, /bulk-import)          │
│   ├── Teacher Dashboard (/classes, /sessions, /sessions/[id]/live)          │
│   └── Student Portal (Personal Attendance, Dispute Filing)                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      Supabase Auth / Postgres RLS / REST
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       DATABASE & AUTH LAYER (Supabase)                      │
│   PostgreSQL 17 with Row-Level Security (RLS) & pgvector                    │
│   ├── Multi-tenant isolation (institution_id scoped RLS)                   │
│   ├── Shared SQL Functions: derive_session_roster(), audit logging          │
│   ├── Concurrency: pg_advisory_xact_lock() on biometrics & atomic claims   │
│   └── Supabase Storage: Temp enrollment & dispute evidence photos          │
└───────────────────▲───────────────────────────────────────▲─────────────────┘
                    │                                       │
    Async Polling / │                      REST Auth /      │
    Embedding Update│                      Session Review   │
                    │                                       │
┌───────────────────┴───────────────┐   ┌───────────────────┴─────────────────┐
│     ENROLLMENT WORKER SERVICE     │   │     CAMERA & RECOGNITION SERVICE    │
│       (Python Background)         │   │       (FastAPI on Render)           │
│  - Polls enrollment_jobs table    │   │  - RTSP IP Camera stream ingest     │
│  - Generates ArcFace embeddings   │   │  - InsightFace (ArcFace 512-D)      │
│  - Deletes raw source photo       │   │  - Quorum boundary calculation      │
│  - Advisory locked transactional  │   │  - Gap analysis & camera degradation│
│    is_primary assignment          │   │  - Dispute resolution & CSV export  │
└───────────────────────────────────┘   └─────────────────────────────────────┘
```

---

## 🌟 Core System Highlights

### 1. Multi-Tenancy & Row-Level Security (RLS)
- Every single entity carries an `institution_id` foreign key.
- Strict PostgreSQL RLS policies enforce tenant isolation at the database engine level, preventing data leakage across institutions regardless of client bugs.
- Complex cross-table permission queries use `SECURITY DEFINER` functions pinned with `search_path = public, pg_temp` to prevent SQL search-path hijacking.

### 2. Biometric Verification & Privacy Preservation
- Multi-photo representation: Supports multiple biometric embeddings per student (`student_biometrics`) tagged with `is_primary` to avoid single-angle fragility.
- High-performance vector comparison: Uses ArcFace (512-dimensional embeddings) and dlib ResNet models with cosine similarity matching.
- Immediate photo disposal: Upon successful embedding generation, the raw photo is purged from Supabase Storage—preserving privacy while maintaining recognition accuracy.

### 3. Quorum-Based Session Boundary Detection
- Instead of rigidly relying on scheduled timetables, `detect_session_boundaries()` groups matched observations by time slice.
- Calculates dynamic presence density against:
  $$\text{Threshold} = \max(\text{quorum\_fraction} \times \text{roster\_size},\, \text{min\_quorum\_count})$$
- Detects true session boundaries (`actual_start`, `actual_end`), falling back to `needs_review` if quorum is not established.

### 4. Smart Gap Analysis & Camera Degradation Awareness
- Evaluates consecutive student observations during class sessions.
- Automatically correlates absence intervals against `camera_degraded_windows` derived from historical RTSP connection failures.
- Zero penalization on camera failure: If a camera degrades or goes offline, student attendance is marked as `camera_issue` or `uncertain` for human verification, never silently marked absent.

### 5. Permitted Exit Workflow
- Teachers can log one-tap permitted exits (e.g., student illness or restroom break) with automatic resolution to session end.
- Permitted windows are completely excluded from gap-penalty calculations, preventing false proxy flags.

### 6. Dispute Resolution with Automated Evidence
- Students can contest flagged attendance records directly from their portal.
- The dispute engine automatically fetches and attaches the highest-quality camera capture snapshot as objective evidence.
- Every manual override or dispute resolution creates an immutable entry in the `audit_logs` table.

---

## 📁 Repository Structure

```
PSYS/
├── apps/
│   └── web/                         # Next.js 16 Web Application (App Router)
│       ├── app/                     # Next.js routes (Dashboard, Sessions, Students, etc.)
│       │   ├── attendance/          # Session attendance & exception review
│       │   ├── cameras/             # Camera management & RTSP feeds
│       │   ├── classes/             # Course & timetable scheduling
│       │   ├── disputes/            # Dispute resolution desk
│       │   ├── login/               # Authentication with 1-click Demo credentials
│       │   ├── sessions/            # Session overview & Live monitoring dashboard
│       │   ├── settings/            # Institution attendance thresholds
│       │   ├── students/            # Student roster, enrollment & bulk CSV upload
│       │   └── student-dashboard.tsx# Dedicated student persona view
│       ├── lib/                     # Server actions, Supabase SSR clients, rate limiters
│       └── scripts/
│           └── seed-demo-users.mjs  # Automation script to seed demo personas
├── services/
│   ├── camera-service/              # FastAPI Camera & Recognition Microservice
│   │   ├── app/
│   │   │   ├── capture/             # RTSP capture, camera health & credentials
│   │   │   ├── finalization/        # Quorum boundaries, gap check & disputes
│   │   │   ├── recognition/         # InsightFace (ArcFace 512-D) & dlib pipelines
│   │   │   ├── reporting/           # Attendance CSV generation
│   │   │   └── scheduling/          # Session lifecycle runner & tick cron
│   │   ├── Dockerfile               # Production container for Render
│   │   └── requirements.txt
│   └── enrollment-worker/           # Async Biometric Embedding Worker
│       ├── app/worker.py            # Transactional worker with advisory locking
│       └── requirements.txt
├── supabase/
│   └── migrations/                  # 40 Production PostgreSQL migrations
│       ├── 0001_cameras.sql
│       ├── 0005_rls_policies_and_audit_logs.sql
│       ├── 0028_session_roster_derivation.sql
│       └── 0040_set_primary_biometric.sql
└── docs/                            # Architecture specs, decision logs & operations guide
```

---

## 🛠️ Tech Stack & Tools

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 | Server-side rendering, fast TTFB, modern component architecture. |
| **Backend API** | FastAPI, Uvicorn, Python 3.11 | High-throughput asynchronous endpoints for computer vision tasks. |
| **Face Recognition** | InsightFace (ArcFace 512-D), ONNX Runtime, dlib | State-of-the-art face embedding accuracy and cosine similarity matching. |
| **Database & Auth** | Supabase (PostgreSQL 17, pgvector, Row-Level Security, Auth) | Multi-tenant isolation, native vector search, JWT authentication. |
| **Storage** | Supabase Storage | S3-compatible storage with institution-scoped upload policies. |
| **Hosting** | Vercel (Web), Render (FastAPI Microservice) | Serverless frontend scale + continuous Python container runtime. |

---

## ⚙️ Setup & Deployment Guide

### 1. Database & Supabase Setup
1. Create or restore a project at [supabase.com](https://supabase.com).
2. Apply migrations sequentially using the Supabase CLI:
   ```bash
   supabase db push
   # Or execute the files in supabase/migrations/ via the Supabase SQL Editor
   ```
3. Create the `enrollment-photos` and `capture-frames` storage buckets:
   ```sql
   insert into storage.buckets (id, name, public)
   values ('enrollment-photos', 'enrollment-photos', false),
          ('capture-frames', 'capture-frames', false)
   on conflict (id) do nothing;
   ```

### 2. Camera Service (FastAPI) on Render
The camera service is dockerized and live on [Render](https://render.com):
- **Live URL**: `https://psys-camera-service.onrender.com`
- **Environment Variables**:
  - `SUPABASE_URL`: Your Supabase URL (`https://<project-ref>.supabase.co`)
  - `SUPABASE_SERVICE_ROLE_KEY`: Service role secret
  - `TICK_SECRET`: Shared secret for cron triggers
  - `CAMERA_1_CREDS`: Camera credentials (`admin:password`)

### 3. Web App Deployment on Vercel
1. Import repository `ps-ys/PSYS` into [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `apps/web`.
3. Add the following **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anonymous Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key
   - `CAMERA_SERVICE_URL`: `https://psys-camera-service.onrender.com`
4. Click **Deploy**.

### 4. Seed Demo Accounts
Once the database is live, run the automated seed script to populate test personas:
```bash
cd apps/web
npm run seed:demo
```
This sets up `admin@test.local`, `teacher@test.local`, and `student@test.local` with password `demoPassword123!`.

---

## 💻 Local Development

### Web Application
```bash
cd apps/web
npm install
npm run dev
# Visit http://localhost:3000
```

### Camera Service
```bash
cd services/camera-service
conda create -n psys-camera python=3.11 -y
conda activate psys-camera
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
