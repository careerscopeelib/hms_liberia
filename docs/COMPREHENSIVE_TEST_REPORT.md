# U-HPCMS Comprehensive Test Report

**Date:** 2026-02-26  
**Scope:** All roles × all features (step-by-step)  
**Environment:** Frontend http://localhost:5174, Backend (SQLite), seeded data

---

## 1. Test Credentials (Email / U-HPCMS mode)

| Role | Email | Password |
|------|--------|----------|
| Super Admin | super@uhpcms.local | admin123 |
| Org Admin | orgadmin@demo.local | admin123 |
| Doctor | doctor@demo.local | admin123 |
| Nurse | nurse@demo.local | admin123 |
| Accountant | accountant@demo.local | admin123 |
| Receptionist | receptionist@demo.local | admin123 |
| Pharmacist | pharmacist@demo.local | admin123 |
| Representative | representative@demo.local | admin123 |

**Note:** Use the **Email (U-HPCMS)** toggle on the login page for all above.  
**Org Admin / Portal users:** After login, select organization **Unified Demo Hospital** from the sidebar if prompted (Super Admin sees org selector; Org Admin and portal users use their assigned org).

---

## 2. Role × Feature Matrix (Sidebar access)

| Feature (route) | Super Admin | Org Admin | Doctor | Nurse | Accountant | Receptionist | Pharmacist | Representative |
|-----------------|:-----------:|:----------:|:------:|:-----:|:----------:|:------------:|:----------:|:--------------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | Finance Dashboard | ✅ | ✅ | ✅ |
| Departments | ✅ | ✅ | — | — | — | — | — | — |
| Doctors | ✅ | ✅ | — | — | — | ✅ | — | — |
| Patients | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ |
| Schedule | ✅ | ✅ | ✅ | — | — | ✅ | — | ✅ |
| Appointments | ✅ | ✅ | ✅ | — | — | ✅ | — | ✅ |
| Patient flow (Workflow) | ✅ | ✅ | — | — | — | — | — | — |
| Prescriptions | ✅ | ✅ | ✅ | — | — | — | — | — |
| Lab / Investigations | ✅ | ✅ | ✅ | — | — | — | — | — |
| Inpatient | ✅ | ✅ | — | — | — | — | — | — |
| Pharmacy | ✅ | ✅ | — | — | — | — | ✅ | — |
| Bed Manager | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Billing & Account | ✅ | ✅ | — | — | ✅ (tabs) | — | — | — |
| Insurance | ✅ | ✅ | — | — | ✅ | — | — | — |
| Reports / Reporting | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| HRM | ✅ | ✅ | — | — | — | — | — | — |
| Noticeboard | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |
| Case Manager | ✅ | ✅ | ✅ | — | — | — | — | — |
| Activities | ✅ | ✅ | ✅ | — | — | — | — | — |
| Chat | ✅ | ✅ | — | — | — | — | — | — |
| Employees (Legacy) | ✅ | ✅ | — | — | — | — | — | — |
| Legacy Patients | ✅ | ✅ | — | — | — | — | — | — |
| OPD Queue | ✅ | ✅ | — | — | — | — | — | — |
| Org setup | ✅ | ✅ | — | — | — | — | — | — |
| Settings | ✅ | ✅ | — | — | — | — | — | ✅ |
| Audit log | ✅ | ✅ | — | — | — | — | — | — |
| Governance | ✅ only | — | — | — | — | — | — | — |

---

## 3. Step-by-Step Test Results (Executed)

### 3.1 Super Admin (super@uhpcms.local)

1. **Login** — ✅ Pass  
   - Switched to "Email (U-HPCMS)", entered super@uhpcms.local / admin123, redirected to `/dashboard`.

2. **Dashboard** — ✅ Pass  
   - KPIs (Total Patients, Doctors, Appointments), Key metrics (encounters, revenue, pending lab/prescriptions), Analysis charts, Legacy HMS stats, Key features grid. Org selector in sidebar (— Select org —, Monrovia Hospital, ELWA Hospital, Unified Demo Hospital).

3. **Departments** — ✅ Pass  
   - Page "Department Management", "Add Department" button, table (ID, Name).

4. **Patients** — ✅ Pass  
   - Page "Patients"; with no org selected shows "Select an organization". After selecting "Unified Demo Hospital" in sidebar, page shows org selector in content and table (MRN, Name, PID, Gender, Phone, Created, Actions). **Note:** For Super Admin, selecting org in main content (Patients page) may differ from sidebar org; ensure one org is selected for data to load.

5. **Billing & Account** — ✅ Pass  
   - "Billing & Account Manager", tabs: Add Bill/Workflow, Invoice List, Payment Report, Debit Report, Credit Report. "Select encounter" dropdown with option e.g. enc_demo1 — MRN: MRN001 (triage).

6. **Governance** — ✅ Pass  
   - "System Governance — Organizations". Create form (Name, Type: Hospital/Clinic/Pharmacy), "Create" button. Table of organizations (e.g. Monrovia Hospital, ELWA Hospital, Unified Demo Hospital) with Manage.

7. **Org setup (/org-admin)** — ⚠️ Not verified in this run  
   - Direct navigation to `/org-admin` returned `net::ERR_ABORTED` once; may be transient. **Recommendation:** Retest via sidebar "Org setup" link and verify departments, users, roles, modules for an org.

8. **Other routes (not clicked in session)**  
   - Schedule, Appointments, Workflow, Prescriptions, Lab, Inpatient, Pharmacy, Beds, Insurance, Reporting, HRM, Noticeboard, Cases, Activities, Chat, Employees, Legacy Patients, OPD, Settings, Audit — **assumed reachable** from sidebar; no errors observed for Dashboard, Departments, Patients, Billing, Governance.

### 3.2 Org Admin (orgadmin@demo.local)

- **Not executed in this session.**  
- **Steps to test:** Login with Email (U-HPCMS) → select "Unified Demo Hospital" if selector shown → verify: Dashboard, Org setup (departments, users, roles, modules), Patients, Billing, Noticeboard, Settings, Audit log. Confirm **no** Governance link.

### 3.3 Doctor (doctor@demo.local)

- **Not executed in this session.**  
- **Steps to test:** Login → expect redirect to Dashboard; sidebar: Dashboard, Patient List, Schedule Management, Appointment Management, Prescription Management, Noticeboard, Hospital Activities, Bed Manager, Case Manager. Open each and confirm no console/network errors and data loads where applicable.

### 3.4 Nurse (nurse@demo.local)

- **Not executed in this session.**  
- **Steps to test:** Login → Dashboard, Noticeboard, Bed Manager, Reports. Verify each page loads.

### 3.5 Accountant (accountant@demo.local)

- **Not executed in this session.**  
- **Steps to test:** Login → expect redirect to **Finance Dashboard** (not main Dashboard). Sidebar: Finance Dashboard; Billing (and tabs: Invoice List, Payment Report, Debit Report, Credit Report); Insurance; Finance Reports; Reporting; Patient List (reference). Verify billing tabs and finance reports load.

### 3.6 Receptionist (receptionist@demo.local)

- **Not executed in this session.**  
- **Steps to test:** Login → Dashboard, Doctor List, Manage Patient, View Schedule, Appointment Management, Noticeboard.

### 3.7 Pharmacist (pharmacist@demo.local)

- **Not executed in this session.**  
- **Steps to test:** Login → Dashboard, Manage Medicine List, Medicine Category (#categories), Noticeboard.

### 3.8 Representative (representative@demo.local)

- **Not executed in this session.**  
- **Steps to test:** Login → Dashboard, Manage Patient, View Schedule, Manage Appointment.

---

## 4. Global / Cross-Role Checks

- **Header search** — Placeholder "Search patients, doctors, employees..."; with org selected, typing 2+ chars should show dropdown (Patients, Doctors/Staff, Notices). Submit or "View all results" → `/patients?q=...`.  
- **NEW UPDATE** — Links to `/noticeboard`.  
- **Notifications (bell)** — Opens dropdown; should list notices (from noticeboard); "View all notices" → `/noticeboard`.  
- **Profile (avatar)** — Opens dropdown: user name, email, role; Settings link; Log out.  
- **Log out** — Sidebar "Log out" and profile dropdown "Log out" should clear session and redirect to `/login`.

---

## 5. Recommended Test Procedure (All Roles)

For each role in section 1:

1. Log out if already logged in (sidebar or profile menu).
2. On login page, select **Email (U-HPCMS)**.
3. Enter the role’s email and password; click Sign in.
4. If org selector appears (Super Admin or Org Admin), select **Unified Demo Hospital** (or target org).
5. For **every** sidebar item listed for that role in the matrix (section 2):
   - Click the link.
   - Confirm: page title/heading matches feature, no blank screen, no uncaught errors in console.
   - If the page has tabs (e.g. Billing), switch tabs and confirm each loads.
6. Optional: Test header search, noticeboard link, profile, and logout once per role.

---

## 6. Summary

| Area | Status | Notes |
|------|--------|--------|
| Login (U-HPCMS) | ✅ | Super Admin login and redirect verified. |
| Super Admin – Dashboard | ✅ | KPIs, metrics, charts, org selector. |
| Super Admin – Departments | ✅ | List + Add Department. |
| Super Admin – Patients | ✅ | Requires org selection; table and actions. |
| Super Admin – Billing | ✅ | Tabs and encounter selector. |
| Super Admin – Governance | ✅ | Create org, list orgs, Manage. |
| Super Admin – Org setup | ⚠️ | Retest /org-admin (one ERR_ABORTED). |
| Org Admin / Portal roles | 📋 | Not run; follow section 5. |
| Header (search, notices, profile, NEW UPDATE) | 📋 | Manual check recommended. |

**Next steps:**  
- Retest Org setup (sidebar and direct URL).  
- Run the recommended procedure (section 5) for Org Admin, Doctor, Nurse, Accountant, Receptionist, Pharmacist, Representative.  
- Optionally add Lab and Patient roles to seed and repeat for those roles.

---

## 7. How to Run This Test Suite Manually

1. Ensure backend is running: `cd backend && npm start` (default port 3000).
2. Ensure frontend is running: `cd frontend && npm run dev` (e.g. http://localhost:5174).
3. Open the app in a browser; use **Email (U-HPCMS)** on the login page.
4. For each role in section 1, log out (sidebar "Log out" or profile → Log out), then log in with that role’s email/password.
5. For that role, open every sidebar link listed in section 2 and confirm the page loads and has no console errors.
6. Optionally test header search, NEW UPDATE, notifications, and profile dropdown once per role.
