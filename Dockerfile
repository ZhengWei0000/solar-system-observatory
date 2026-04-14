FROM node:20-alpine AS deps

WORKDIR /app

RUN npm install -g pnpm@10.33.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=deps --chown=nextjs:nextjs /app/public ./public
COPY --from=deps --chown=nextjs:nextjs /app/.next ./.next
COPY --from=deps --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nextjs /app/data ./data

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
  CMD node -e "http = require('http'); http.get('http://127.0.0.1:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
