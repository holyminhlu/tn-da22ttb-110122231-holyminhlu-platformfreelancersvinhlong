FROM node:22-alpine AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/ ./

RUN mkdir -p \
  uploads/jobs \
  uploads/services \
  uploads/identity \
  uploads/chat \
  uploads/avatars \
  uploads/profile-files \
  uploads/disputes

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
