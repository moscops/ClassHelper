# 배포 가이드 (Docker + AWS EC2)

> 범위: 도메인/HTTPS 없이 **EC2 퍼블릭 IP로 바로 접속**하는 첫 배포. Postgres도 같은 서버에
> 컨테이너로 함께 띄웁니다 (관리형 DB 아님). CI/CD 자동배포는 2026-09-04에 구축 완료(5·6번 섹션 참고) —
> 도메인 연결·HTTPS만 아직 다음 단계.

## 0. 로컬에서 먼저 빌드 테스트 (선택 — CI/CD가 매 push마다 이미 이미지를 빌드/검증하므로 필수는 아님)

`docker-compose.prod.yml`은 이제 `image:`만 참조하고 `build:`가 없어서(6번 섹션 참고),
`docker compose up --build`로는 로컬에서 더 이상 빌드가 안 됩니다. 그래도 EC2/CI에 올리기 전에
직접 확인해보고 싶으면, 이미지를 먼저 로컬 빌드해서 compose가 참조하는 이름 그대로 태깅하세요:

```bash
cd ClassHelper
cp backend/.env.production.example backend/.env
# backend/.env를 열어 DATABASE_URL의 <DB_PASSWORD>, CORS_ORIGIN, JWT_ACCESS_SECRET,
# JWT_REFRESH_SECRET을 채운다 (JWT 시크릿은 openssl rand -hex 32 로 생성)

cat > .env <<'EOF'
POSTGRES_PASSWORD=<backend/.env의 DATABASE_URL 비밀번호와 동일한 값>
EOF

docker build -t ghcr.io/moscops/classhelper-backend:latest ./backend
docker build -t ghcr.io/moscops/classhelper-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 ./frontend

docker compose -f docker-compose.prod.yml up -d   # 로컬에 이미 있는 이미지를 그대로 사용, pull 안 함
docker compose -f docker-compose.prod.yml logs -f
```

마이그레이션은 backend 컨테이너가 시작하면서 자동으로 적용됩니다(수동 실행 불필요).
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
EOF
```

`NEXT_PUBLIC_API_URL`은 더 이상 EC2의 `.env`에 두지 않습니다 — **빌드 시점에 프론트 번들에 그대로
박히는 값**이라, 지금은 GitHub Actions의 Variables(`NEXT_PUBLIC_API_URL`, 6번 섹션 참고)에서
관리하고 이미지 빌드 시 그 값이 박힙니다. 나중에 도메인이 살아나면 그 변수 값만 바꾸고 재배포하면
됩니다.

## 4. 최초 실행

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

마이그레이션은 backend 컨테이너 시작 시 자동 적용됩니다(수동 `exec` 불필요, Dockerfile CMD 참고).

`http://<EC2_PUBLIC_IP>:3001` 접속해서 확인.

## 5. 이후 업데이트 배포 (2026-09-04부터: 자동 배포)

이제 `dev` 브랜치에 push하면 GitHub Actions(`.github/workflows/docker-publish.yml`)가 이미지를
빌드해 `ghcr.io`에 올리고, EC2에서 도는 watchtower 컨테이너가 60초 간격으로 새 이미지를 감지해
알아서 `docker pull` + 재시작합니다. **EC2에 SSH로 들어가서 뭘 실행할 필요가 없습니다.**

최초 1회만 EC2에서 아래 설정이 필요합니다 (자세한 내용은 이 문서 끝의 "6. CI/CD 자동배포 최초 설정" 참고):
- `ghcr.io` 이미지가 private면 `docker login ghcr.io` 1회
- `docker-compose.prod.yml`을 최신 버전(watchtower 포함)으로 교체
- `docker compose -f docker-compose.prod.yml up -d` 로 재기동 (더 이상 `--build` 불필요 — 이미지를 pull만 함)

마이그레이션도 이제 backend 컨테이너 시작 시 자동 적용됩니다 (`yarn prisma:migrate:deploy`가
Dockerfile CMD에 포함됨) — 수동 `exec` 불필요.

배포 진행 상황이나 실패 여부는 GitHub 저장소의 **Actions** 탭에서 확인할 수 있습니다.

## 6. CI/CD 자동배포 최초 설정 (한 번만)

1. **GitHub Actions 변수 설정**: repo → Settings → Secrets and variables → Actions → **Variables** 탭
   → `NEXT_PUBLIC_API_URL` 추가 (예: `http://3.38.4.169:3000`, 나중에 도메인 붙으면
   `https://api.classhelper.co.kr`로 값만 교체 후 재배포). `GITHUB_TOKEN`은 별도 설정 불필요(자동 제공).
2. **ghcr.io 패키지 공개 범위 결정**: 첫 이미지 푸시 후 repo의 **Packages** 탭에서
   `classhelper-backend`/`classhelper-frontend` 패키지가 생성됩니다. 기본은 private입니다.
   - **Public으로 바꾸면** EC2에서 별도 로그인 없이 바로 pull 가능 (가장 간단, 이번 세션의
     "서버에 자격증명 안 두기" 방향과도 맞음).
   - **Private로 유지**하려면 EC2에서 최초 1회 `docker login ghcr.io -u <github계정명> -p <PAT>`
     실행 필요 (PAT는 GitHub → Settings → Developer settings → Personal access tokens에서
     `read:packages` 권한으로 발급).
3. **EC2에서 새 `docker-compose.prod.yml` 반영**:
   ```bash
   cd ClassHelper
   git pull
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d
   ```
4. **동작 확인**: `dev`에 아무 커밋이나 push → 몇 분 뒤 `docker ps`로 backend/frontend 컨테이너의
   `CREATED` 시간이 갱신됐는지 확인, 또는 `docker logs classhelper-watchtower -f`로 pull 로그 확인.

## 다음 단계 (지금은 범위 밖, 필요할 때)

- **도메인 + HTTPS**: 도메인을 연결하면 Nginx 리버스 프록시 + Let's Encrypt(Certbot)로 HTTPS 적용,
  `CORS_ORIGIN`/`NEXT_PUBLIC_API_URL`을 도메인 기준으로 교체.
- **관리형 DB(RDS) 전환**: 트래픽이 늘면 EC2 재시작/재배포와 DB 생명주기를 분리하기 위해 고려.
