FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma/ prisma/
RUN npm ci
RUN npx prisma generate

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
COPY src/ src/
EXPOSE 8080
ENV PORT=8080 NODE_ENV=production
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
