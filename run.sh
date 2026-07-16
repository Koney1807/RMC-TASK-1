#!/bin/bash
# Boots the Task 1 backend (Quarkus) and frontend (Vite, via Deno) together
# in this one terminal. Ctrl+C stops both.
trap 'kill $(jobs -p)' EXIT

(cd backend && \
  MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/registration_db" \
  FRONTEND_ORIGIN="http://localhost:5173" \
  mvn quarkus:dev) &

(cd frontend && \
  [ -f .env ] || cp .env.example .env && \
  deno install && \
  deno task dev) &

wait
