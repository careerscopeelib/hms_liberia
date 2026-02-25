#!/usr/bin/env bash
# Run Hospital Management System (build + Tomcat)
set -e
cd "$(dirname "$0")"

MVN=""
if command -v mvn &>/dev/null; then
  MVN=mvn
elif [ -f ./mvnw ] && [ -x ./mvnw ]; then
  MVN=./mvnw
fi

if [ -z "$MVN" ]; then
  echo "Maven not found. Install Maven or add the Maven Wrapper (run: mvn -N wrapper:wrapper)."
  echo "See SETUP_AND_RUN.md for full setup steps."
  exit 1
fi

echo "Building and starting Hospital Management System on http://localhost:8080/"
exec $MVN clean package tomcat7:run-war
