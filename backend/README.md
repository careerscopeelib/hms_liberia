# Hospital Management System – Node.js Backend

REST API for the Hospital Management System. Supports **PostgreSQL** or **SQLite** (via `sql.js`).

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Database

**Option A: SQLite (default)**

- No extra setup. On first run, if `data/hospital.db` does not exist, the server creates it and applies schema + seed.
- Or run once: `npm run init-db:sqlite`

**Option B: PostgreSQL**

- Create database: `createdb hospital`
- Apply schema: `psql -U postgres -d hospital -f database/schema-postgres.sql`
- Apply seed: `psql -U postgres -d hospital -f database/seed-postgres.sql`
- Or run: `npm run init-db:postgres` (requires `PG_*` in `.env`)
- Set in `.env`: `DB_TYPE=postgres` and set `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`
- **File attachments:** `npm run init-db:postgres` runs `schema-uhpcms-entity-docs-postgres.sql` so Lab, Insurance, Case Manager, HRM, Billing and Prescriptions can store attachments. If your Postgres DB was created before that, run once: `psql $DATABASE_URL -f database/schema-uhpcms-entity-docs-postgres.sql`

### 3. Environment

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

- `DB_TYPE=sqlite` or `postgres`
- `PORT=3000` (or another port if 3000 is in use)

## Run

```bash
npm start
```

API base: `http://localhost:3000` (or your `PORT`).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| POST | /api/auth/login | Login `{ role, username, password }` |
| GET | /api/employees | List active employees |
| GET | /api/employees/doctors | List active doctors |
| GET | /api/employees/search?by=name&firstName=..&lastName=.. | Search employees |
| POST | /api/employees | Add employee (admin) |
| PUT | /api/employees/:eid | Update employee |
| DELETE | /api/employees/:eid | Soft-delete employee |
| GET | /api/patients | List patients |
| GET | /api/patients/search?by=pid&pid=.. | Search patients |
| POST | /api/patients | Add patient |
| PUT | /api/patients/:pid | Update patient |
| GET | /api/opd | List OPD (optional ?status=0\|1\|2) |
| GET | /api/opd/doctor/:doctorId | Pending OPD for doctor |
| POST | /api/opd | Add to OPD `{ pid, doctorid }` |
| DELETE | /api/opd/queue/:pid | Remove from queue |
| PUT | /api/opd/:opdid/complete | Mark OPD complete |
| GET | /api/opd/:opdid/details | Get prescription |
| PUT | /api/opd/:opdid/details | Save prescription |
| GET | /api/opd/patient/:pid/history | Patient OPD history |
| GET | /api/stats | Dashboard stats (doctors, patients, employees, OPD income) |

## Demo login (after seed)

- **Administrator:** role `administrator`, username `root123`, password `root1234`
- **Doctor:** role `doctor`, username `EMP101`, password (see original demo file; or add via admin)

---

## U-HPCMS (Unified Hospital, Clinic & Pharmacy Management)

Extra schema and APIs for governance, organizations, encounters, and billing in **USD** and **Liberian Dollars (LRD)**.

### Seed U-HPCMS data

After the server has run at least once (so the U-HPCMS schema is applied), run:

```bash
npm run seed-uhpcms
```

This creates a demo organization, super-admin user, and demo encounter.

- **Super-admin:** email `super@uhpcms.local`, password `admin123`
- **Currency:** default rate LRD per USD is 193.5 (set in `.env` as `LRD_PER_USD` or in `system_settings` table).

### U-HPCMS API (JWT required unless noted)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/uhpcms/auth/login | Login `{ email, password }` or `{ role, username, password }` → returns JWT |
| GET | /api/uhpcms/settings | Currency options and LRD/USD rate (no auth) |
| GET | /api/uhpcms/governance/organizations | List organizations |
| POST | /api/uhpcms/governance/organizations | Create org (super_admin) |
| GET | /api/uhpcms/governance/organizations/:id/modules | List org modules |
| PUT | /api/uhpcms/governance/organizations/:id/modules | Set modules (super_admin) |
| GET | /api/uhpcms/encounters | List encounters |
| POST | /api/uhpcms/encounters | Create encounter |
| PATCH | /api/uhpcms/encounters/:id | Update encounter status/notes |
| GET | /api/uhpcms/billing/charges?encounter_id= | List charges |
| POST | /api/uhpcms/billing/charges | Add charge (USD or LRD) |
| GET | /api/uhpcms/billing/invoices?encounter_id= | List invoices |
| POST | /api/uhpcms/billing/invoices | Create invoice |
| POST | /api/uhpcms/billing/payments | Record payment (USD or LRD) |

Send JWT in header: `Authorization: Bearer <token>`.
