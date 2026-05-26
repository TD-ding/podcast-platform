FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

FROM node:18-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app /app
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
CMD ["node", "backend/app.js"]
