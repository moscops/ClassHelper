# ClassHelper 프론트엔드(Next.js) 프로덕션 이미지 — 공식 Next.js standalone 패턴 사용.
FROM node:22-alpine AS base
WORKDIR /app

# ---- 의존성 설치 ----
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---- 빌드 ----
# NEXT_PUBLIC_* 값은 브라우저 번들에 빌드 시점에 그대로 박히므로(런타임에 못 바꿈),
# 반드시 build-arg로 넘겨서 next build 전에 확정되어야 한다.
FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# ---- 프로덕션 실행 ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
