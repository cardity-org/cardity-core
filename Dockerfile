FROM node:22-bookworm AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libcurl4-openssl-dev \
    libssl-dev \
    libarchive-dev \
    nlohmann-json3-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libcurl4 \
    libssl3 \
    libarchive13 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/build /app/build
COPY --from=build /app/bin /app/bin
COPY --from=build /app/examples /app/examples

EXPOSE 8787

CMD ["node", "bin/cardity_http_server.js"]
