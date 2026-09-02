'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  GraduationCap,
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  FileText,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  Eye,
  EyeOff,
  Info,
  Home,
} from 'lucide-react';
import { authService } from '@/lib/auth-service';
import { useAuthStore } from '@/stores/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

const registerSchema = z
  .object({
    academyName: z.string().min(2, { message: '학원 이름은 최소 2자 이상이어야 합니다.' }),
    academyPhone: z.string().min(8, { message: '학원 대표번호를 올바르게 입력해주세요.' }),
    businessNumber: z.string().optional(),
    address: z.string().optional(),
    name: z.string().min(2, { message: '원장님 성함을 입력해주세요.' }),
    email: z.string().email({ message: '올바른 이메일 주소를 입력해주세요.' }),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
      .regex(/[A-Za-z]/, { message: '영문자를 최소 1자 이상 포함해야 합니다.' })
      .regex(/[0-9]/, { message: '숫자를 최소 1자 이상 포함해야 합니다.' })
      .regex(/[!@#$%^&*(),.?":{}|<>]/, {
        message: '특수문자(!@#$%^&* 등)를 최소 1자 이상 포함해야 합니다.',
      }),
    confirmPassword: z.string().min(1, { message: '비밀번호 확인을 입력해주세요.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      academyName: '',
      academyPhone: '',
      businessNumber: '',
      address: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password') || '';

  const hasMinLength = passwordValue.length >= 8;
  const hasLetter = /[A-Za-z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue);

  const strengthScore = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthInfo = () => {
    if (passwordValue.length === 0)
      return { label: '비밀번호를 입력해주세요', color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-400', width: 'w-0' };
    if (strengthScore <= 1)
      return { label: '매우 취약 (사용 불가)', color: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', width: 'w-1/4' };
    if (strengthScore === 2)
      return { label: '취약 (사용 불가)', color: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', width: 'w-2/4' };
    if (strengthScore === 3)
      return { label: '보통 (특수문자/숫자 추가 필요)', color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', width: 'w-3/4' };
    return { label: '안전하고 강력함 (사용 가능)', color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', width: 'w-full' };
  };

  const strengthInfo = getStrengthInfo();

  const handleNextStep = async () => {
    const isValid = await trigger(['academyName', 'academyPhone']);
    if (isValid) {
      setErrorMessage(null);
      setStep(2);
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.registerOwner({
        academyName: values.academyName,
        academyPhone: values.academyPhone || undefined,
        businessNumber: values.businessNumber || undefined,
        address: values.address || undefined,
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
      });

      setAuth(response);
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : '회원가입 처리 중 오류가 발생했습니다.');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
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
      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
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
            학원 개설 & 원장님 가입
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {step === 1 ? '1단계: 학원 기본 정보 입력' : '2단계: 원장님 관리자 계정 생성'}
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-7 sm:p-9">
          {/* Step Indicator Pills */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-emerald-500 text-white'
                }`}
              >
                {step === 2 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </span>
              <span className={`text-xs font-semibold ${step === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                학원 정보
              </span>
            </div>

            <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-700"></div>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                2
              </span>
              <span className={`text-xs font-semibold ${step === 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                원장님 계정
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* STEP 1: 학원 기본 정보 */}
            {step === 1 && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-300 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    선택 항목(사업자번호, 주소)은 가입 후 <span className="font-semibold text-indigo-700 dark:text-indigo-300">[학원 설정]</span>에서 언제든지 등록하실 수 있습니다.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>학원 명칭 <span className="text-rose-500">*</span></span>
                    <span className="text-[11px] text-slate-400 font-normal">학부모 알림톡 발송처 표기</span>
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="예: 클래스헬퍼 어학원 대치본원"
                      className={`block w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border ${
                        errors.academyName
                          ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                      } rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-all`}
                      {...register('academyName')}
                    />
                  </div>
                  {errors.academyName && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.academyName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>학원 대표 전화번호 <span className="text-rose-500">*</span></span>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">알림톡 발신번호로 사용</span>
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="02-1234-5678 또는 010-1234-5678"
                      className={`block w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border ${
                        errors.academyPhone
                          ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                      } rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none transition-all`}
                      {...register('academyPhone')}
                    />
                  </div>
                  {errors.academyPhone && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.academyPhone.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      사업자등록번호 (선택)
                    </label>
                    <input
                      type="text"
                      placeholder="123-45-67890"
                      className="block w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      {...register('businessNumber')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      학원 주소 (선택)
                    </label>
                    <input
                      type="text"
                      placeholder="서울시 강남구 테헤란로 123"
                      className="block w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      {...register('address')}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full mt-3 flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-3 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all cursor-pointer"
                >
                  <span>다음: 원장님 계정 설정</span>
                </button>
              </div>
            )}

            {/* STEP 2: 원장님 계정 정보 */}
            {step === 2 && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    원장님 성함 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="김원장"
                      className={`block w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border ${
                        errors.name
                          ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-100 dark:focus:ring-rose-950'
                          : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-950'
                      } rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-3 transition-all`}
                      {...register('name')}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      로그인 이메일 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-2xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="owner@academy.kr"
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      휴대폰 번호 (선택)
                    </label>
                    <div className="relative rounded-2xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="010-1234-5678"
                        className="block w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        {...register('phone')}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field with Strength Meter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>비밀번호 설정 <span className="text-rose-500">*</span></span>
                    <span className={`text-[11px] font-semibold ${strengthInfo.text}`}>
                      {strengthInfo.label}
                    </span>
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="8자 이상, 영문/숫자/특수문자 조합"
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

                  <div className="mt-1.5 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthInfo.color} ${strengthInfo.width} transition-all duration-300 rounded-full`}
                    ></div>
                  </div>

                  <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-600'}`}>
                      {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
                      <span>8자 이상</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-600'}`}>
                      {hasLetter ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
                      <span>영문자 포함</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-600'}`}>
                      {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
                      <span>숫자 포함</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-600'}`}>
                      {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
                      <span>특수문자(!@#$%^&*) 포함</span>
                    </div>
                  </div>

                  {errors.password && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    비밀번호 확인 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="비밀번호 재입력"
                      className={`block w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border ${
                        errors.confirmPassword
                          ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-100 dark:focus:ring-rose-950'
                          : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-950'
                      } rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-3 transition-all`}
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 flex justify-center items-center py-3 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    <span>이전</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || strengthScore < 4}
                    className="w-2/3 flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-3 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>학원 등록 중...</span>
                      </>
                    ) : (
                      <span>학원 개설 및 가입 완료</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Link to Login */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          이미 등록된 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
