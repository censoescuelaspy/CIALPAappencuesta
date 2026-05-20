FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tools/database ./tools/database

ENV NODE_ENV=production
CMD ["node", "tools/database/cialpa_db_api.mjs"]
