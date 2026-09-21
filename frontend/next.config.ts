import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Docker 이미지를 위한 최소 실행 번들 생성 (backend/EC2 배포 작업, 2026-09-02)
  output: "standalone",
};

export default nextConfig;
