/**
 * 앱 부팅 시점에 필수 환경 변수 존재 여부를 검증한다.
 * 값이 하나라도 없으면 하드코딩된 기본값으로 조용히 대체하지 않고
 * 즉시 부팅을 실패시켜(fail fast) 프로덕션에 취약한 기본 시크릿이
 * 배포되는 것을 방지한다.
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENV_VARS.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `[ENV] 다음 필수 환경 변수가 설정되지 않았습니다: ${missing.join(', ')}. ` +
        `backend/.env.example을 참고하여 .env 파일에 값을 설정한 뒤 다시 시작해주세요.`,
    );
  }

  return config;
}
