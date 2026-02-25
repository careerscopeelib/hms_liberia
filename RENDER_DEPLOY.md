# Deploying HMS Liberia on Render

This guide walks you through deploying the Hospital Management System (backend API + frontend) on [Render](https://render.com).

## Option A: Blueprint (recommended)

1. **Connect the repo to Render**
   - Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
   - Connect your GitHub/GitLab repo (e.g. `careerscopeelib/hms_liberia`).
   - Render will read `render.yaml` and create:
     - A **PostgreSQL** database (`hms-liberia-db`).
     - A **Web Service** for the API (`hms-liberia-api`, from `backend/`).
     - A **Static Site** for the frontend (`hms-liberia`, from `frontend/`).

2. **Set environment variables**
   - After the first deploy, open the **hms-liberia-api** service → **Environment**.
   - Set **CORS_ORIGIN** to your frontend URL (e.g. `https://hms-liberia.onrender.com`).
   - Open the **hms-liberia** (frontend) service → **Environment**.
   - Set **VITE_API_URL** to your backend URL (e.g. `https://hms-liberia-api.onrender.com`).  
     (No trailing slash.)
   - Redeploy the frontend so the build picks up `VITE_API_URL`.

3. **Initialize the database (one-time)**
   - In Render Dashboard, open **hms-liberia-db** and copy the **Internal Database URL** (or use the **External** URL if you run from your machine).
   - Open **hms-liberia-api** → **Shell** (or use your local terminal with the same URL).
   - Run:
     ```bash
     cd backend
     export DATABASE_URL="postgres://..."   # paste your database URL
     node scripts/init-db-postgres.js
     ```
   - This creates the legacy HMS tables and seed data. For U-HPCMS features (organizations, encounters, etc.) the app currently uses SQLite locally; Postgres seed for U-HPCMS can be added later.

4. **Open the app**
   - Frontend: `https://hms-liberia.onrender.com` (or the URL Render shows).
   - Backend health: `https://hms-liberia-api.onrender.com/api/health`.
   - Log in with the legacy seed user (e.g. Administrator / root123 / root1234 from `seed-postgres.sql`) or the credentials you added.

---

## Option B: Manual setup

### Backend (Web Service)

1. **New** → **Web Service**; connect the repo.
2. **Root Directory:** `backend`.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Environment:**
   - **DATABASE_URL** – from a Render PostgreSQL instance (create from **New** → **PostgreSQL** and use its connection string), **or** leave unset to use SQLite (ephemeral on free tier).
   - **JWT_SECRET** – generate a random string (e.g. `openssl rand -base64 32`).
   - **CORS_ORIGIN** – your frontend URL (e.g. `https://hms-liberia.onrender.com`).
6. After first deploy, run the database init once (see step 3 in Option A) if using Postgres.

### Frontend (Static Site)

1. **New** → **Static Site**; connect the same repo.
2. **Root Directory:** `frontend`
3. **Build Command:** `npm install && npm run build`
4. **Publish Directory:** `dist`
5. **Environment:**
   - **VITE_API_URL** – your backend URL (e.g. `https://hms-liberia-api.onrender.com`). Must be set before building.
6. Add a **Rewrite** rule: source `/*`, destination `/index.html` (for client-side routing).

---

## Environment reference

| Variable        | Service  | Description |
|----------------|----------|-------------|
| `PORT`         | Backend  | Set by Render; do not override. |
| `DATABASE_URL`| Backend  | PostgreSQL connection string (from Render Postgres). |
| `DB_TYPE`     | Backend  | Omit when using `DATABASE_URL`; otherwise `sqlite` or `postgres`. |
| `JWT_SECRET`   | Backend  | Secret for JWT; use a strong random value in production. |
| `CORS_ORIGIN`  | Backend  | Frontend origin (e.g. `https://hms-liberia.onrender.com`). |
| `VITE_API_URL` | Frontend | Backend API URL (e.g. `https://hms-liberia-api.onrender.com`). Set before build. |

---

## Notes

- **Free tier:** Backend and DB may spin down after inactivity; first request can be slow.
- **SQLite:** If you don’t attach a Postgres DB, the backend uses SQLite. On Render the filesystem is ephemeral, so data is lost on redeploy. Use Postgres for production.
- **U-HPCMS:** Full U-HPCMS (organizations, encounters, billing) uses extra tables that are seeded via `npm run seed-uhpcms` with SQLite. For Postgres-only production, run the legacy init first; U-HPCMS Postgres support can be added later.
