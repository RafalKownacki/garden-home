FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY shared ./shared
RUN npm ci --workspace api
COPY api/tsconfig.json ./api/
COPY api/src ./api/src
RUN cd api && npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/api/dist ./dist
COPY --from=build /workspace/shared ../shared
RUN mkdir -p ./data
EXPOSE 19010
CMD ["node", "dist/api/src/server.js"]
