FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
COPY libs ./libs
COPY scripts ./scripts

RUN npm ci
RUN npm run build:packages && npm run build --workspace=apps/server

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3008

EXPOSE 3008

CMD ["npm", "run", "start", "--workspace=apps/server"]
