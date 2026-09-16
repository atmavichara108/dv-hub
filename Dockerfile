# DV Hub — development image
# Только для локальной разработки. Прод работает на PM2 + Nginx без Docker (ADR-001).

FROM node:22-slim

WORKDIR /app

# Build tools для нативной сборки better-sqlite3 (если нет prebuilt-бинаря)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8787

# Apply migrations (idempotent) then start the dev server with hot reload.
CMD ["sh", "-c", "node scripts/init-db.js && npm run dev"]
