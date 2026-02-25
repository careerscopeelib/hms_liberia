# Hospital Management System – Setup and Run

## What this project is

- **Hospital Management System (HMS)** – Java web app for OPD, doctors, receptionists, and admins.
- **Stack:** Spring MVC, Hibernate, MySQL, Maven, JSP/Bootstrap.
- **Server:** Runs as a WAR on **Apache Tomcat** (port **8080**).

---

## Prerequisites

1. **JDK 8 or 11**  
   - Install from [Adoptium](https://adoptium.net/) or your OS package manager.  
   - Check: `java -version`

2. **Apache Maven**  
   - Install from [maven.apache.org](https://maven.apache.org/download.cgi) or e.g. `brew install maven`.  
   - Check: `mvn -v`

3. **MySQL Server**  
   - Install MySQL or MariaDB.  
   - Default config expected: `localhost:3306`, user `root`, password empty (see below to change).

---

## 1. Install dependencies (Maven)

From the project root:

```bash
mvn clean dependency:resolve
```

Optional: package the WAR:

```bash
mvn clean package
```

---

## 2. Database setup

- Create database: `hospital`
- Import schema and demo data from `databaseFiles and demoLoginCredentials/hospitaldb/`

**Option A – Script (if `mysql` is in PATH):**

```bash
chmod +x setup-database.sh
./setup-database.sh
```

If your MySQL `root` user has a password:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS hospital;"
for f in "databaseFiles and demoLoginCredentials/hospitaldb"/hospital_*.sql; do mysql -u root -p hospital < "$f"; done
```

**Option B – Manual (MySQL Workbench or CLI):**

1. Create database: `CREATE DATABASE hospital;`
2. Run each `.sql` in `databaseFiles and demoLoginCredentials/hospitaldb/` in this order:  
   `hospital_employee.sql` → `hospital_patient.sql` → `hospital_login.sql` → `hospital_idgenerate.sql` → `hospital_opd.sql` → `hospital_opddetails.sql` → `hospital_routines.sql`

Demo login credentials are in:  
`databaseFiles and demoLoginCredentials/loginPasswordsForDemo.txt`

---

## 3. Configure database (optional)

If MySQL is not `root` with no password, edit:

**File:** `src/main/webapp/WEB-INF/springMVC-servlet.xml`

Update the `myDataSource` bean:

- `user` – your MySQL user
- `password` – your MySQL password  
- `jdbcUrl` – e.g. `jdbc:mysql://localhost:3306/hospital`

---

## 4. Start the application

From the project root:

```bash
chmod +x run.sh
./run.sh
```

Or directly with Maven:

```bash
mvn clean package tomcat7:run-war
```

Then open: **http://localhost:8080/**

Log in using a role and credentials from `databaseFiles and demoLoginCredentials/loginPasswordsForDemo.txt` (e.g. Administrator: `root123` / `root1234`).

---

## Summary

| Step              | Command / action                                      |
|-------------------|--------------------------------------------------------|
| Install deps      | `mvn clean dependency:resolve`                         |
| Setup DB          | `./setup-database.sh` or run SQL files in order        |
| Start server      | `./run.sh` or `mvn clean package tomcat7:run-war`      |
| App URL           | http://localhost:8080/                                |
