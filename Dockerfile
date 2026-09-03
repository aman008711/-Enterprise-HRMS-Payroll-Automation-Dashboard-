# ==============================================================================
# Multi-Stage Production Dockerfile for Enterprise HRMS & Payroll Automation
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend SPA
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm ci || npm install

# Copy source and build production bundle
COPY frontend/ ./
# Configure relative API path so client communicates directly with the unified backend
ENV VITE_API_URL=/api
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build Backend Application
# ------------------------------------------------------------------------------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

# Install backend dependencies (including devDependencies for TypeScript compiler)
COPY backend/package*.json ./
RUN npm ci || npm install

# Copy source and compile TypeScript
COPY backend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runner (Lightweight Alpine Container)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install dumb-init to properly handle PID 1 signal forwarding and process reaping
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy package definitions and install only production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled backend output from Stage 2
COPY --from=backend-builder /app/backend/dist ./dist

# Copy compiled frontend SPA output from Stage 1 into the public static folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Use the non-root node user for hardened container security
USER node

# Expose server HTTP port
EXPOSE 5000

# Container healthcheck targeting the /health API probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
