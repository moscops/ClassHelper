'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Home,
  Terminal,
  ArrowRight,
  Building2,
  Tablet,
  KeyRound,
  CheckCircle2,
  Sparkles,
  UserPlus,
} from 'lucide-react';

import { authService } from '@/lib/auth-service';
import { attendanceService } from '@/lib/attendance-service';
import { useAuthStore } from '@/stores/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

const isDev = process.env.NODE_ENV === 'development';

const DEV_TEST_ACCOUNTS = [
  {
    role: 'SUPER_ADMIN',
    roleLabel: '최고관리자',
    badgeColor:
      'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    title: '플랫폼 총괄 관리자',
    email: 'admin@classhelper.kr',
    password: 'password123!',
    desc: '전체 입점 학원 관제 및 시스템 설정',
  },
  {
    role: 'OWNER',
    roleLabel: '원장님',
    badgeColor:
      'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    title: '클래스헬퍼 대치본원 (김원장)',
    email: 'owner@classhelper.kr',
    password: 'password123!',
    desc: '원생·출결·수강료·수업일지 통합 관리',
  },
  {
    role: 'OWNER',
    roleLabel: '원장님 2',
    badgeColor:
      'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    title: '에듀스타 목동본원 (이원장)',
    email: 'owner2@edustar.kr',
    password: 'password123!',
    desc: '멀티테넌시 격리 검증용 제2학원',
  },
];

const loginSchema = z.object({
  email: z.string().email({ message: '올바른 이메일 형식을 입력해주세요.' }),
  password: z.string().min(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, isHydrated, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.login(values);
      setAuth(response);
      if (response.user.mustChangePassword) {
        router.push('/change-password');
      } else if (response.user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : '이메일 또는 비밀번호가 올바르지 않습니다.');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    await onSubmit({ email, password: pass });
  };

  const [activeTab, setActiveTab] = useState<'admin' | 'join' | 'kiosk'>('admin');
  const [inputKioskToken, setInputKioskToken] = useState('');
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [isKioskLoading, setIsKioskLoading] = useState(false);
  const [isDevKioskLoading, setIsDevKioskLoading] = useState(false);

  // Staff Self-Join Form State
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState<'TEACHER' | 'STAFF'>('TEACHER');
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinConfirmPassword, setJoinConfirmPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 로컬 스토리지에 남아있는 키오스크 토큰을 완전 제거하여 보안 유지
      localStorage.removeItem('classhelper_kiosk_token');
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'kiosk' || params.get('mode') === 'kiosk') {
        setActiveTab('kiosk');
      } else if (params.get('tab') === 'join' || params.get('code')) {
        setActiveTab('join');
        if (params.get('code')) {
          setJoinCode(params.get('code')!);
        }
      }
    }
  }, []);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinErrorMessage('학원 초대 코드를 입력해주세요.');
      return;
    }
    if (!joinName.trim()) {
      setJoinErrorMessage('이름을 입력해주세요.');
      return;
    }
    if (!joinEmail.trim()) {
      setJoinErrorMessage('이메일을 입력해주세요.');
      return;
    }
    if (joinPassword.length < 8) {
      setJoinErrorMessage('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    const hasLetter = /[A-Za-z]/.test(joinPassword);
    const hasDigit = /\d/.test(joinPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(joinPassword);
    if (!hasLetter || !hasDigit || !hasSpecial) {
      setJoinErrorMessage('비밀번호는 영문, 숫자, 특수문자(!@#$%^&* 등)를 모두 포함해야 합니다.');
      return;
    }
    if (joinPassword !== joinConfirmPassword) {
      setJoinErrorMessage('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsJoinLoading(true);
    setJoinErrorMessage(null);
    try {
      const response = await authService.joinStaff({
        code: joinCode.trim(),
        role: joinRole,
        name: joinName.trim(),
        email: joinEmail.trim(),
        phone: joinPhone.trim() || undefined,
        password: joinPassword.trim(),
      });
      setAuth(response);
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : '교직원 가입 중 오류가 발생했습니다. 학원 코드를 확인해주세요.');
      setJoinErrorMessage(message);
    } finally {
      setIsJoinLoading(false);
    }
  };


  const extractToken = (input: string) => {
    const trimmed = input.trim();
    if (trimmed.includes('/kiosk/')) {
      const parts = trimmed.split('/kiosk/');
      return parts[parts.length - 1].split('?')[0].split('#')[0].trim();
    }
    return trimmed;
  };

  const handleEnterKiosk = (tokenToUse?: string) => {
    const target = tokenToUse || inputKioskToken;
    const finalToken = extractToken(target);
    if (!finalToken) {
      setKioskError('키오스크 접속 링크 또는 토큰을 입력해주세요.');
      return;
    }
    setIsKioskLoading(true);
    router.push(`/kiosk/${finalToken}`);
  };

  const handleDevLaunchKiosk = async () => {
    setIsDevKioskLoading(true);
    setKioskError(null);
    try {
      const authRes = await authService.login({
        email: 'owner@classhelper.kr',
        password: 'password123!',
      });
      setAuth(authRes);
      const kioskRes = await attendanceService.generateKioskToken();
      router.push(`/kiosk/${kioskRes.kioskToken}`);
    } catch {
      setKioskError('데모 키오스크 토큰을 발급받지 못했습니다.');
      setIsDevKioskLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative transition-colors duration-200 overflow-hidden bg-ambient-mesh bg-tech-grid">
      {/* Atmospheric Ambient Glowing Orbs */}
      <div className="absolute -top-32 -left-20 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-indigo-500/15 to-transparent blur-[100px] pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-20 w-[32rem] h-[32rem] rounded-full bg-gradient-to-tl from-purple-500/15 to-transparent blur-[100px] pointer-events-none -z-10" />

      {/* Top Floating Controls (Theme Toggle + Home Button) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2.5 z-20">
        <ThemeToggle />
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs"
        >
          <Home className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>홈으로</span>
        </Link>
      </div>

      {/* Clean Single Center Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
            </span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {activeTab === 'admin' ? '학원 로그인' : '출석 키오스크'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {activeTab === 'admin'
              ? '원장님, 강사 및 관리자 계정으로 접속하세요.'
              : '로비 태블릿 거치용 전화번호 4자리 셀프 출석 체크 전용 모드입니다.'}
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-7 sm:p-9">
          {/* Active Session Notice (No auto-redirect) */}
          {isHydrated && isAuthenticated && (
            <div className="mb-5 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
              <div className="text-xs text-indigo-950 dark:text-indigo-200 truncate">
                현재 <span className="font-bold">{user?.name || user?.email}</span> 계정으로 로그인되어 있습니다.
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      user?.mustChangePassword
                        ? '/change-password'
                        : user?.role === 'SUPER_ADMIN'
                        ? '/admin'
                        : '/dashboard',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  {user?.mustChangePassword ? '비밀번호 변경' : '대시보드'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authService.logout();
                    } catch {}
                    useAuthStore.getState().logout();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  로그아웃
                </button>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 mb-6 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setErrorMessage(null);
                setKioskError(null);
                setJoinErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>로그인</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setErrorMessage(null);
                setKioskError(null);
                setJoinErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="truncate">교직원 초대 가입</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('kiosk');
                setErrorMessage(null);
                setKioskError(null);
                setJoinErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'kiosk'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>출석 키오스크</span>
            </button>
          </div>


          {/* 1. Admin / Staff Login Tab */}
          {activeTab === 'admin' && (
            <>
              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    이메일 계정
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="name@academy.kr"
                      className={`block w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border ${
                        errors.email
                          ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                      } rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-all`}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    비밀번호
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="비밀번호 입력"
                      className={`block w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border ${
                        errors.password
                          ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                      } rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-all`}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-3 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>로그인 확인 중...</span>
                    </>
                  ) : (
                    <span>로그인</span>
                  )}
                </button>
              </form>

              {/* Dev Quick-Login Section (Stripped in Production Build) */}
              {isDev && (
                <div className="mt-6 pt-5 border-t border-dashed border-amber-300 dark:border-amber-700/60 bg-gradient-to-b from-amber-50/70 to-amber-50/20 dark:from-amber-950/30 dark:to-amber-950/10 -mx-3 px-4 py-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5" />
                        개발 환경 전용 빠른 로그인
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-700/40 font-mono">
                      DEV ONLY
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mb-3 leading-relaxed">
                    계정을 클릭하면 로컬 시드(seed) 계정으로 1초 만에 즉시 로그인됩니다. (프로덕션 빌드 시 번들에서 완전 제외)
                  </p>
                  <div className="space-y-2">
                    {DEV_TEST_ACCOUNTS.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleQuickLogin(account.email, account.password)}
                        className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-amber-200/90 dark:border-amber-800/80 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/40 dark:hover:bg-slate-800/60 transition-all shadow-2xs group cursor-pointer disabled:opacity-50 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${account.badgeColor}`}
                            >
                              {account.roleLabel}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                              {account.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {account.email}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                          <span>즉시 로그인</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 2. Staff Self-Join Tab */}
          {activeTab === 'join' && (
            <div className="space-y-4">
              <div className="text-center mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  교직원 학원 초대 코드 가입
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  학원에서 발급받은 초대 코드로 가입하면 즉시 교직원으로 자동 등록됩니다.
                </p>
              </div>

              {joinErrorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{joinErrorMessage}</span>
                </div>
              )}

              <form onSubmit={handleJoinSubmit} className="space-y-3.5">
                {/* Academy Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    학원 초대 코드 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="원장님께 전달받은 초대 코드 입력"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.trim())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-indigo-600 dark:text-indigo-400 font-bold"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    가입 직책 선택 <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setJoinRole('TEACHER')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        joinRole === 'TEACHER'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>강사 (선생님)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinRole('STAFF')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        joinRole === 'STAFF'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>조교 / 행정스태프</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    이름 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    이메일 (로그인 ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="teacher@classhelper.kr"
                    value={joinEmail}
                    onChange={(e) => setJoinEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    휴대폰 번호 <span className="text-slate-400 font-normal">(선택)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={joinPhone}
                    onChange={(e) => setJoinPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    비밀번호 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showJoinPassword ? 'text' : 'password'}
                      required
                      placeholder="8자 이상, 영문/숫자/특수문자 포함"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowJoinPassword(!showJoinPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    비밀번호 확인 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 다시 입력"
                    value={joinConfirmPassword}
                    onChange={(e) => setJoinConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {joinPassword && joinConfirmPassword && (
                    <p className={`text-[11px] mt-1 font-medium ${joinPassword === joinConfirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {joinPassword === joinConfirmPassword ? '✓ 비밀번호가 일치합니다.' : '✗ 비밀번호가 일치하지 않습니다.'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isJoinLoading}
                  className="w-full mt-2 flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-3 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isJoinLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>교직원 등록 처리 중...</span>
                    </>
                  ) : (
                    <span>교직원 가입 및 대시보드 입장</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* 3. Attendance Kiosk Entry Tab */}
          {activeTab === 'kiosk' && (
            <div className="space-y-4">
              {/* Kiosk Error Alert */}
              {kioskError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{kioskError}</span>
                </div>
              )}

              {/* Token Manual Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEnterKiosk();
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    학원 키오스크 링크 또는 토큰 입력
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={inputKioskToken}
                      onChange={(e) => {
                        setInputKioskToken(e.target.value);
                        setKioskError(null);
                      }}
                      placeholder="키오스크 URL 또는 토큰 붙여넣기"
                      className="block w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    관리자 화면([1초 출결 체크] ➔ [출석 키오스크])에서 복사한 링크나 접속 토큰을 붙여넣으세요.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!inputKioskToken.trim() || isKioskLoading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-3 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isKioskLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>키오스크 로딩 중...</span>
                    </>
                  ) : (
                    <>
                      <Tablet className="w-4 h-4 mr-2" />
                      <span>키오스크 모드 시작</span>
                    </>
                  )}
                </button>
              </form>

              {/* Dev Demo Kiosk Launcher */}
              {isDev && (
                <div className="mt-4 pt-4 border-t border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 -mx-2 px-3 py-3 rounded-xl border border-amber-200/70 dark:border-amber-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" />
                      [DEV] 데모 학원 키오스크 즉시 실행
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                      DEV ONLY
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isDevKioskLoading}
                    onClick={handleDevLaunchKiosk}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-all shadow-2xs group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>클래스헬퍼 대치본원 키오스크 즉시 열기</span>
                    </div>
                    {isDevKioskLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </button>
                </div>
              )}

              {/* Guide Box */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                💡 <strong>키오스크 모드란?</strong> 학생이 로비 태블릿에서 전화번호 뒷자리 4자리만 터치하여 등원·하원을 직접 체크하는 무인 출석 단말기 화면입니다.
              </div>
            </div>
          )}
        </div>

        {/* Footer Link */}
        {activeTab === 'admin' ? (
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <div>
              아직 등록된 학원이 없으신가요?{' '}
              <Link
                href="/register"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors"
              >
                학원 개설 및 원장님 가입
              </Link>
            </div>
            <div>
              원장님께 초대 코드를 받으셨나요?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-4 cursor-pointer"
              >
                교직원 초대 가입
              </button>
            </div>
          </div>
        ) : activeTab === 'join' ? (
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            이미 등록된 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-4 cursor-pointer"
            >
              학원 관리 로그인으로 이동
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            학원 관리자 페이지로 이동하시려면?{' '}
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors cursor-pointer"
            >
              학원 관리 로그인으로 전환
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
