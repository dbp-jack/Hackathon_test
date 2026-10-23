# Launch Kit pipeline worker — Claude + ffmpeg + sharp.
# Build from the repo root (the worker imports ../src/lib/types.ts):
#   docker build -f worker/Dockerfile -t launch-kit-worker .
#   docker run --env-file .env launch-kit-worker
FROM node:24-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# deps first so the layer caches; sharp ships prebuilt binaries for linux-x64/arm64 glibc
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# only what worker/index.ts reaches
COPY tsconfig.json ./
COPY src/lib ./src/lib
COPY worker ./worker

ENV NODE_ENV=production \
    FFMPEG_PATH=ffmpeg \
    CAPTION_FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf \
    WORK_DIR=/tmp/launch-kit-work \
    MOCK_MODE=false

# Supabase/Anthropic keys come from the platform (fly secrets / Railway variables), not the image.
CMD ["npx", "tsx", "worker/index.ts"]
