FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY private ./private
RUN mkdir -p /app/data
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data SETTINGS_ENV_PATH=/app/data/settings.env
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "src/server.js"]
