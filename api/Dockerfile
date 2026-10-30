FROM node:20-alpine AS build
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci
COPY api/ ./
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app/api
COPY --from=build /app/api/node_modules ./node_modules
COPY --from=build /app/api/dist ./dist
COPY --from=build /app/api/package.json ./
COPY datos /app/datos
EXPOSE 3000
CMD ["sh", "-c", "npm run migration:run:prod && npm run seed:prod && node dist/main"]
