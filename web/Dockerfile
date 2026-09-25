# Static build of the Poons site, served by Caddy. Build context is the repo root
# (the site imports the shared art engine from ../art). Railway injects PORT.
FROM node:24-slim AS build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY art /app/art
COPY web .
ARG VITE_API_URL
ARG VITE_TOKEN_ADDRESS
RUN npm run build && rm -f dist/assets/demo-*.js

FROM caddy:2-alpine
COPY web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/web/dist /srv
