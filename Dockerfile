FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install

# install dependencies first so they can be cached
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM base AS release
COPY --from=install /usr/src/app/.output /usr/src/app/.output
USER bun
EXPOSE 3000/tcp
ENV DATA_DIR=/data
ENTRYPOINT ["bun", "run", ".output/server/index.mjs"]