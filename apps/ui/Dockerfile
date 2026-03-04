FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
COPY libs ./libs
COPY scripts ./scripts

RUN npm ci
RUN npm run build:packages && npm run build --workspace=apps/server && npm run build --workspace=apps/ui

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3008
ENV AUTOMAKER_WEB_PORT=3007
ENV AUTOMAKER_SERVER_PORT=3008

EXPOSE 3007
EXPOSE 3008

CMD ["sh", "-c", "npm run start --workspace=apps/server & npm run preview --workspace=apps/ui -- --host 0.0.0.0 --port 3007"]
