# 배포 가이드 (Docker + AWS EC2)

> 범위: 도메인/HTTPS 없이 **EC2 퍼블릭 IP로 바로 접속**하는 첫 배포. Postgres도 같은 서버에
> 컨테이너로 함께 띄웁니다 (관리형 DB 아님). 도메인 연결·HTTPS·CI/CD 자동배포는 다음 단계.

## 0. 로컬에서 먼저 빌드 테스트 (EC2 가기 전 필수)

EC2에서 실패하면 디버깅이 훨씬 번거로우니, 로컬에 Docker가 있다면 먼저 여기서 검증하세요.

```bash
cd ClassHelper
cp backend/.env.production.example backend/.env
# backend/.env를 열어 DATABASE_URL의 <DB_PASSWORD>, CORS_ORIGIN, JWT_ACCESS_SECRET,
# JWT_REFRESH_SECRET을 채운다 (JWT 시크릿은 openssl rand -hex 32 로 생성)

cat > .env <<'EOF'
POSTGRES_PASSWORD=<backend/.env의 DATABASE_URL 비밀번호와 동일한 값>
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec backend yarn prisma:migrate:deploy
docker compose -f docker-compose.prod.yml logs -f
```

`http://localhost:3001`(프론트), `http://localhost:3000/api-docs`... 는 프로덕션 모드라 Swagger가
꺼져 있는 게 정상입니다(main.ts에서 `NODE_ENV=production`이면 비활성화). 회원가입/로그인이 되면 통과.

## 1. EC2 인스턴스 만들기 (AWS 콘솔)

1. **AMI**: Ubuntu 22.04 LTS (또는 24.04)
2. **인스턴스 타입**: `t3.small` 이상 권장. `next build`가 메모리를 꽤 씁니다 — `t2/t3.micro`(1GB)는
   프론트엔드 빌드 중 OOM으로 죽을 가능성이 높습니다. 비용이 부담되면 micro + 스왑 파일(2번 참고)로
   버틸 수는 있지만, 처음엔 small로 시작하는 걸 추천합니다.
3. **스토리지**: 최소 20GB (이미지 빌드 캐시 포함)
4. **보안 그룹(인바운드)**:
   - `22/tcp` (SSH) — Source를 본인 IP로 제한 (0.0.0.0/0 금지)
   - `3000/tcp` (백엔드 API) — 0.0.0.0/0
   - `3001/tcp` (프론트엔드) — 0.0.0.0/0
5. **키페어**: 새로 생성하고 `.pem` 파일 안전하게 보관

## 2. 서버 초기 설정 (SSH 접속 후)

```bash
ssh -i <키페어>.pem ubuntu@<EC2_PUBLIC_IP>

sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
newgrp docker   # 그룹 반영 (또는 재접속)

# 메모리가 4GB 미만이면 스왑 추가 (next build OOM 방지)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. 코드 가져오기 + 환경변수 설정

```bash
git clone https://github.com/JoshyWoshy1212/ClassHelper.git
cd ClassHelper

cp backend/.env.production.example backend/.env
nano backend/.env
# - DATABASE_URL: <DB_PASSWORD> 부분을 실제 비밀번호로 (postgres 서비스명 그대로 유지)
# - CORS_ORIGIN=http://<EC2_PUBLIC_IP>:3001
# - JWT_ACCESS_SECRET / JWT_REFRESH_SECRET: 각각 `openssl rand -hex 32`로 생성한 값 (서로 달라야 함)

cat > .env <<EOF
POSTGRES_PASSWORD=<backend/.env와 동일한 DB 비밀번호>
NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP>:3000
EOF
```

`NEXT_PUBLIC_API_URL`은 **빌드 시점에 프론트 번들에 그대로 박히는 값**이라, EC2 퍼블릭 IP를 정확히
넣어야 합니다 (나중에 IP가 바뀌면 프론트를 다시 빌드해야 함 — 그래서 도메인을 붙이는 게 결국 더
편합니다).

## 4. 빌드 & 실행

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec backend yarn prisma:migrate:deploy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

`http://<EC2_PUBLIC_IP>:3001` 접속해서 확인.

## 5. 이후 업데이트 배포

```bash
cd ClassHelper
git pull
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec backend yarn prisma:migrate:deploy  # 새 마이그레이션 있을 때만
```

## 다음 단계 (지금은 범위 밖, 필요할 때)

- **도메인 + HTTPS**: 도메인을 연결하면 Nginx 리버스 프록시 + Let's Encrypt(Certbot)로 HTTPS 적용,
  `CORS_ORIGIN`/`NEXT_PUBLIC_API_URL`을 도메인 기준으로 교체.
- **레지스트리 + CI/CD 자동배포**: 지금은 EC2에서 직접 `docker compose build`. 나중에 GitHub
  Actions에서 이미지를 빌드해 ECR/Docker Hub에 푸시하고, EC2는 `docker pull`만 하도록 바꾸면
  배포마다 EC2에서 무거운 빌드를 돌릴 필요가 없어집니다 (`.github/workflows/cd.yml`이 지금은
  빌드 검증만 하고 실제 배포 스텝이 없는 상태 — 이 업그레이드 때 같이 채우면 됨).
- **관리형 DB(RDS) 전환**: 트래픽이 늘면 EC2 재시작/재배포와 DB 생명주기를 분리하기 위해 고려.
