#!/usr/bin/env bash
# Create MySQL database 'hospital' and import schema (run once).
# Requires: MySQL client, database 'hospital', user root with access.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_DIR="$SCRIPT_DIR/databaseFiles and demoLoginCredentials/hospitaldb"

if ! command -v mysql &>/dev/null; then
  echo "MySQL client not found. Install MySQL and ensure 'mysql' is in PATH."
  exit 1
fi

echo "Creating database 'hospital' (if not exists)..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS hospital;"

echo "Importing schema and data..."
# Order: tables without FKs first, then tables with FKs
for f in hospital_employee.sql hospital_patient.sql hospital_login.sql hospital_idgenerate.sql hospital_opd.sql hospital_opddetails.sql hospital_routines.sql; do
  if [ -f "$DB_DIR/$f" ]; then
    echo "  $f"
    mysql -u root hospital < "$DB_DIR/$f"
  fi
done

echo "Database setup complete. Use credentials from databaseFiles and demoLoginCredentials/loginPasswordsForDemo.txt"
