FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data SETTINGS_ENV_PATH=/app/data/settings.env
COPY --from=build /app/node_modules ./node_modules
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node private ./private
COPY package.json ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/server.js"]
