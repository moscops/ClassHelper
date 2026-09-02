import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { TokensResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token =
      useAuthStore.getState().accessToken ||
      localStorage.getItem('classhelper_access_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Handle 401 & Automatic Refresh Token Rotation (RTR)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized occurs and it's not a login/refresh/register request
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register-owner');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        useAuthStore.getState().refreshToken ||
        localStorage.getItem('classhelper_refresh_token');

      if (!refreshToken) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Request new tokens using Refresh Token
        const response = await axios.post<TokensResponse>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const newTokens = response.data;
        useAuthStore.getState().setTokens(newTokens);

        processQueue(null, newTokens.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle Network / DB Connection / 5xx Server Errors
    const status = error.response?.status;
    const url = originalRequest.url || '';
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    const isServerError = status && status >= 500;

    if (typeof window !== 'undefined' && (isNetworkError || isServerError)) {
      // Dynamic import or direct store access
      try {
        const { useSystemAlertStore } = require('@/stores/useSystemAlertStore');
        const isStudentOrClassUrl = url.includes('/students') || url.includes('/classes');
        const alertTitle = isNetworkError
          ? '데이터베이스 / 서버 통신 장애 발생'
          : '서버 내부 오류 (데이터 조회 실패)';
        const alertMessage = isStudentOrClassUrl
          ? '데이터베이스에 연결되지 않아 학생 및 수업 반 데이터를 정상적으로 불러오지 못했습니다. 백엔드 서버 및 DB 상태를 점검해주세요.'
          : (error.response?.data as any)?.message ||
            '서버와의 통신 중 오류가 발생하여 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';

        useSystemAlertStore.getState().addAlert({
          type: isNetworkError ? 'DB_CONNECTION_ERROR' : 'SERVER_ERROR',
          title: alertTitle,
          message: alertMessage,
          endpoint: url,
        });
      } catch {
        // ignore if store fails to load in SSR
      }
    }

    return Promise.reject(error);
  },
);
