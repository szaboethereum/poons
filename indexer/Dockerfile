# Poons indexer: buy watcher + minter + read API. Node 24 runs the TypeScript directly (type stripping)
# and ships node:sqlite, so there is no build step. The SQLite DB must live on a persistent volume.
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
ENV NODE_ENV=production DB=/data/poons.db
# Railway injects PORT; the API listens on it.
CMD ["sh", "-c", "API_PORT=${PORT:-8788} exec node --disable-warning=ExperimentalWarning src/main.ts"]
