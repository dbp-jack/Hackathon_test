# Launch Kit worker on Hugging Face Spaces (Docker SDK).
# The Space repo is assembled by scripts/deploy-hf.sh from this repo's package files, src/lib and worker/.
FROM node:24-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Spaces run the container as uid 1000; give it a writable home and app dir.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --chown=user tsconfig.json ./
COPY --chown=user src/lib ./src/lib
COPY --chown=user worker ./worker

ENV NODE_ENV=production \
    FFMPEG_PATH=ffmpeg \
    CAPTION_FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf \
    WORK_DIR=/tmp/launch-kit-work \
    MOCK_MODE=false \
    HEALTH_PORT=7860

EXPOSE 7860
CMD ["npx", "tsx", "worker/index.ts"]
