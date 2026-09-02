# ClassHelper 백엔드(NestJS) 프로덕션 이미지
#
# node:22-slim(Debian 기반)을 사용하는 이유: bcrypt가 네이티브 애드온이라
# alpine(musl libc)에서 prebuilt 바이너리 호환성 문제가 종종 발생합니다.
# 이미지 용량보다 "일단 확실하게 빌드/구동되는 것"을 우선했습니다.
FROM node:22-slim AS base
WORKDIR /app

# ---- 의존성 설치 + 빌드 ----
FROM base AS build
COPY package.json yarn.lock prisma.config.ts ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# ---- 프로덕션 실행 ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
