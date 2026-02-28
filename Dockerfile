# syntax=docker/dockerfile:1

FROM node:20-bullseye-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json package-lock.json tsconfig.json next.config.js postcss.config.js tailwind.config.ts ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3020
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY package.json package-lock.json next.config.js ./
COPY prisma ./prisma

EXPOSE 3020

CMD sh -c "npx prisma migrate deploy || npx prisma db push; npx prisma generate; npm run start -- -p 3020"
