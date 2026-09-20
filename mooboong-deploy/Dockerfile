FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node . .
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000 PYTHON_BIN=python3
USER node
EXPOSE 10000
CMD ["node", "server.mjs"]
