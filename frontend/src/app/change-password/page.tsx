'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  LogOut,
  Loader2,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { AppLayout } from '@/components/common/AppLayout';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated, setUser, logout } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Password rule checks
  const ruleMinLength = newPassword.length >= 8;
  const ruleLetter = /[A-Za-z]/.test(newPassword);
  const ruleDigit = /\d/.test(newPassword);
  const ruleSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isRuleAllSatisfied =
    ruleMinLength && ruleLetter && ruleDigit && ruleSpecial;

  const isMatch = Boolean(newPassword && newPassword === confirmPassword);
  const canSubmit =
    Boolean(currentPassword.trim()) &&
    isRuleAllSatisfied &&
    isMatch &&
    !isLoading;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      logout();
      router.replace('/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await authService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      setSuccessMessage(res.message || '비밀번호가 성공적으로 변경되었습니다.');

      // Update store user state
      if (user) {
        setUser({
          ...user,
          mustChangePassword: false,
        });
      }

      // Redirect after brief feedback
      setTimeout(() => {
        if (user?.role === 'SUPER_ADMIN') {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(', ')
          : '비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const isMustChange = Boolean(user?.mustChangePassword);

  return (
    <AppLayout currentPath="/change-password">
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>비밀번호 변경</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isMustChange
                ? '임시 비밀번호로 로그인하셨습니다. 안전한 시스템 이용을 위해 새 비밀번호를 등록해주세요.'
                : '주기적인 비밀번호 변경으로 계정 및 학원 보안을 안전하게 유지하세요.'}
            </p>
          </div>

          {isMustChange && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-2xs transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Card Container */}
        <div className="max-w-xl mx-auto w-full pt-2 pb-8">
          {/* Change Form Card */}
          <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          {/* User Status Notice */}
          <div className="mb-5 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 truncate">
                {user?.name} 님 ({user?.email})
              </div>
              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 mt-0.5">
                {isMustChange ? '최초 로그인 비밀번호 변경 대상' : '비밀번호 자율 변경'}
              </p>
            </div>
            <span className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-2xs">
              {user?.role === 'SUPER_ADMIN'
                ? '플랫폼 관리자'
                : user?.role === 'OWNER'
                ? '원장'
                : user?.role === 'ADMIN'
                ? '실장/부원장'
                : user?.role === 'TEACHER'
                ? '강사'
                : '교직원'}
            </span>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage} 잠시 후 이동합니다...</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="currentPassword"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  현재 비밀번호
                </label>
                {isMustChange && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    전달받은 임시 비밀번호 입력
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  required
                  placeholder={
                    isMustChange
                      ? '발급받은 임시 비밀번호'
                      : '현재 사용 중인 비밀번호'
                  }
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                새 비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Rule Checklist */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  비밀번호 필수 보안 규칙
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div
                    className={`flex items-center gap-1.5 ${
                      ruleMinLength
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {ruleMinLength ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                    )}
                    <span>8자 이상</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      ruleLetter
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {ruleLetter ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                    )}
                    <span>영문 포함</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      ruleDigit
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {ruleDigit ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                    )}
                    <span>숫자 포함</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      ruleSpecial
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {ruleSpecial ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                    )}
                    <span>특수문자(!@#$ 등)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  새 비밀번호 확인
                </label>
                {confirmPassword && (
                  <span
                    className={`text-[11px] font-semibold ${
                      isMatch
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isMatch ? '비밀번호 일치' : '비밀번호 불일치'}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="새 비밀번호 다시 입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && !isMatch
                      ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>변경 처리 중...</span>
                  </>
                ) : (
                  <>
                    <span>비밀번호 변경 완료</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Notice (Only for first-time forced change) */}
          {isMustChange && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>비밀번호 변경 후 시스템에 입장하실 수 있습니다.</span>
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-600 transition-colors font-medium flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  </AppLayout>
  );
}
