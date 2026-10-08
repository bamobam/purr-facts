FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY web ./web
COPY data ./data
# Validates the CSVs (the build fails on an error) and regenerates the JSON the server loads, so the
# image never ships stale derived values or a dataset that skipped validation.
RUN npm run build:data && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/data/products.json /app/data/meta.json /app/data/incidents.json ./data/
EXPOSE 3000
CMD ["node", "dist/rest/server.js"]
