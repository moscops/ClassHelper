'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  LogOut,
  Sparkles,
  BookOpen,
  User,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  attendanceService,
  KioskStudentMatch,
  KioskClassOption,
  AttendanceItem,
} from '@/lib/attendance-service';

type KioskStep = 'KEYPAD' | 'LOOKUP_LOADING' | 'SELECT' | 'CHECKING' | 'SUCCESS' | 'ERROR';

export default function KioskAttendancePage() {
  const params = useParams();
  const rawToken = params?.token;
  const kioskToken = Array.isArray(rawToken) ? rawToken[0] : (rawToken as string) || '';

  // Current live clock state
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Sound effects state
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Kiosk workflow state
  const [step, setStep] = useState<KioskStep>('KEYPAD');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Lookup results
  const [matches, setMatches] = useState<KioskStudentMatch[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<KioskStudentMatch | null>(null);
  const [selectedClass, setSelectedClass] = useState<KioskClassOption | null>(null);

  // Result after check-in
  const [checkInResult, setCheckInResult] = useState<{
    attendance: AttendanceItem;
    studentName: string;
    className: string;
    type: 'CHECK_IN' | 'CHECK_OUT';
  } | null>(null);

  // Auto-reset timers
  const [countdown, setCountdown] = useState<number>(3);
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesized Web Audio chime player
  const playSound = useCallback(
    (type: 'tap' | 'success' | 'error' | 'bell') => {
      if (!isSoundEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === 'tap') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(480, ctx.currentTime);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        } else if (type === 'success' || type === 'bell') {
          // Cheerful melodic major triad: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.09);
            osc.stop(ctx.currentTime + idx * 0.09 + 0.26);
          });
        } else if (type === 'error') {
          // Low alert double-boop
          [280, 220].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.12);
            osc.stop(ctx.currentTime + idx * 0.12 + 0.16);
          });
        }
      } catch {
        // audio policy ignored safely
      }
    },
    [isSoundEnabled],
  );

  // Live clock tick
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      if (selectTimeoutRef.current) clearTimeout(selectTimeoutRef.current);
    };
  }, []);

  // Reset to initial keypad state
  const resetToKeypad = useCallback(() => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    if (selectTimeoutRef.current) clearTimeout(selectTimeoutRef.current);
    setPhoneDigits('');
    setErrorMessage('');
    setMatches([]);
    setSelectedStudent(null);
    setSelectedClass(null);
    setCheckInResult(null);
    setStep('KEYPAD');
  }, []);

  // Trigger Lookup API
  const handleLookup = useCallback(
    async (digitsToLookup: string) => {
      if (!digitsToLookup || digitsToLookup.length !== 4) return;
      if (!kioskToken) {
        setErrorMessage('유효한 키오스크 토큰이 URL에 포함되어 있지 않습니다.');
        setStep('ERROR');
        return;
      }

      setStep('LOOKUP_LOADING');
      setErrorMessage('');

      try {
        const response = await attendanceService.kioskLookup({
          kioskToken,
          phoneLast4: digitsToLookup,
        });

        if (!response.matches || response.matches.length === 0) {
          playSound('error');
          setErrorMessage('등록된 원생을 찾을 수 없습니다.\n전화번호 뒷자리 4자리를 다시 확인해 주세요.');
          setStep('ERROR');
          autoResetTimerRef.current = setTimeout(resetToKeypad, 3000);
          return;
        }

        playSound('tap');
        setMatches(response.matches);

        // Auto-select if only 1 student
        if (response.matches.length === 1) {
          const student = response.matches[0];
          setSelectedStudent(student);
          // Auto-select class if only 1 class
          if (student.classes.length === 1) {
            setSelectedClass(student.classes[0]);
          } else if (student.classes.length > 1) {
            setSelectedClass(student.classes[0]);
          } else {
            setSelectedClass(null);
          }
        } else {
          // Multiple siblings sharing last 4 digits
          setSelectedStudent(null);
          setSelectedClass(null);
        }

        setStep('SELECT');

        // Auto timeout in select view if unattended for 25s
        selectTimeoutRef.current = setTimeout(() => {
          resetToKeypad();
        }, 25000);
      } catch (err: unknown) {
        playSound('error');
        const apiError = err as { response?: { data?: { message?: string }; status?: number } };
        const status = apiError?.response?.status;
        const msg = apiError?.response?.data?.message;

        if (status === 404) {
          setErrorMessage('등록된 원생을 찾을 수 없습니다.\n전화번호 뒷자리 4자리를 다시 확인해 주세요.');
        } else if (status === 429) {
          setErrorMessage('단시간에 너무 많은 요청이 발생했습니다.\n잠시 후 다시 시도해 주세요.');
        } else {
          setErrorMessage(msg || '키오스크 서버 연결에 실패했습니다.\n학원 관리자에게 문의해 주세요.');
        }
        setStep('ERROR');
        autoResetTimerRef.current = setTimeout(resetToKeypad, 3000);
      }
    },
    [kioskToken, playSound, resetToKeypad],
  );

  // Keypad click handlers
  const handleDigitPress = useCallback(
    (digit: string) => {
      if (step !== 'KEYPAD') return;
      if (phoneDigits.length >= 4) return;

      playSound('tap');
      const nextDigits = phoneDigits + digit;
      setPhoneDigits(nextDigits);

      if (nextDigits.length === 4) {
        // Auto trigger lookup when 4th digit entered
        setTimeout(() => {
          handleLookup(nextDigits);
        }, 150);
      }
    },
    [step, phoneDigits, playSound, handleLookup],
  );

  const handleBackspace = useCallback(() => {
    if (step !== 'KEYPAD') return;
    playSound('tap');
    setPhoneDigits((prev) => prev.slice(0, -1));
  }, [step, playSound]);

  const handleClear = useCallback(() => {
    if (step !== 'KEYPAD') return;
    playSound('tap');
    setPhoneDigits('');
  }, [step, playSound]);

  // Physical Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step === 'KEYPAD') {
        if (/^[0-9]$/.test(e.key)) {
          handleDigitPress(e.key);
        } else if (e.key === 'Backspace') {
          handleBackspace();
        } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
          handleClear();
        } else if (e.key === 'Enter' && phoneDigits.length === 4) {
          handleLookup(phoneDigits);
        }
      } else if (step === 'SELECT') {
        if (e.key === 'Escape') {
          resetToKeypad();
        }
      } else if (step === 'SUCCESS' || step === 'ERROR') {
        if (e.key === 'Escape' || e.key === 'Enter') {
          resetToKeypad();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, phoneDigits, handleDigitPress, handleBackspace, handleClear, handleLookup, resetToKeypad]);

  // Handle Check-in action (CHECK_IN or CHECK_OUT)
  const handleCheckIn = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!selectedStudent) return;
    if (!selectedClass) {
      if (selectedStudent.classes.length > 0) {
        setSelectedClass(selectedStudent.classes[0]);
      } else {
        setErrorMessage('체크인 가능한 수업 반이 배정되어 있지 않습니다.');
        setStep('ERROR');
        return;
      }
    }

    const targetClassId = selectedClass ? selectedClass.id : selectedStudent.classes[0]?.id;
    const targetClassName = selectedClass ? selectedClass.name : selectedStudent.classes[0]?.name || '수업';

    if (!targetClassId) {
      setErrorMessage('수업 반 정보가 유효하지 않습니다.');
      setStep('ERROR');
      return;
    }

    if (selectTimeoutRef.current) clearTimeout(selectTimeoutRef.current);
    setStep('CHECKING');

    try {
      const response = await attendanceService.kioskCheckIn({
        kioskToken,
        phoneLast4: phoneDigits,
        studentId: selectedStudent.studentId,
        classId: targetClassId,
        type,
      });

      playSound('bell');
      setCheckInResult({
        attendance: response,
        studentName: selectedStudent.studentName,
        className: targetClassName,
        type,
      });
      setStep('SUCCESS');

      // Countdown 3, 2, 1, then reset
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            resetToKeypad();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      playSound('error');
      const apiError = err as { response?: { data?: { message?: string } } };
      setErrorMessage(apiError?.response?.data?.message || '출결 체크 처리 중 오류가 발생했습니다.');
      setStep('ERROR');
      autoResetTimerRef.current = setTimeout(resetToKeypad, 3500);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Format Korean date string
  const dateString = useMemo(() => {
    if (!currentTime) return '';
    return currentTime.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, [currentTime]);

  // Format Korean time string
  const timeString = useMemo(() => {
    if (!currentTime) return '';
    return currentTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [currentTime]);

  // Token missing guard
  if (!kioskToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-5">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">키오스크 토큰이 필요합니다</h1>
        <p className="text-slate-400 max-w-md text-sm mb-6 leading-relaxed">
          올바른 키오스크 접속 주소(예: <code className="text-indigo-400 bg-slate-900 px-2 py-0.5 rounded">/kiosk/[kioskToken]</code>)로 접속해 주세요. 학원 관리자 페이지(출결 관리)에서 전용 키오스크 주소를 생성할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* 1. Kiosk Top Bar */}
      <header className="h-20 px-6 sm:px-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">ClassHelper</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                출석 키오스크
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">1초 등·하원 셀프 출결 체크</p>
          </div>
        </div>

        {/* Live Clock & Quick Action Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-400 font-medium">{dateString}</div>
            <div className="text-lg font-bold text-slate-100 tracking-wider font-mono flex items-center gap-1.5 justify-end">
              <Clock className="w-4 h-4 text-indigo-400" />
              {timeString}
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4 sm:pl-6">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              title={isSoundEnabled ? '효과음 끄기' : '효과음 켜기'}
              className="p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
            >
              {isSoundEnabled ? <Volume2 className="w-5 h-5 text-indigo-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? '전체화면 종료' : '전체화면 모드 (태블릿 추천)'}
              className="p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
            >
              {isFullscreen ? <Minimize className="w-5 h-5 text-indigo-400" /> : <Maximize className="w-5 h-5 text-slate-300" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Interactive Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
        {/* STEP 1: KEYPAD INPUT */}
        {step === 'KEYPAD' && (
          <div className="w-full max-w-md flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {/* Title & Instructions */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                전화번호 <span className="text-indigo-400">뒷자리 4자리</span>를 입력해 주세요
              </h2>
              <p className="text-sm text-slate-400">
                원생 본인 또는 보호자님의 휴대폰 뒷자리를 눌러주세요
              </p>
            </div>

            {/* 4-Digit Display Boxes */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 w-full">
              {[0, 1, 2, 3].map((index) => {
                const char = phoneDigits[index] || '';
                const isCurrent = phoneDigits.length === index;
                return (
                  <div
                    key={index}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-extrabold border-2 transition-all duration-150 ${
                      char
                        ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-500/20 scale-105'
                        : isCurrent
                        ? 'border-indigo-400/80 bg-slate-900/90 text-indigo-400 animate-pulse'
                        : 'border-slate-800 bg-slate-900/50 text-slate-600'
                    }`}
                  >
                    {char || (isCurrent ? '|' : '·')}
                  </div>
                );
              })}
            </div>

            {/* 3x4 Touch Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="h-16 sm:h-20 rounded-2xl bg-slate-800/80 hover:bg-indigo-600 active:bg-indigo-700 text-2xl sm:text-3xl font-black text-white shadow-md border border-slate-700/60 hover:border-indigo-500 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Clear (C) */}
              <button
                type="button"
                onClick={handleClear}
                className="h-16 sm:h-20 rounded-2xl bg-slate-800/50 hover:bg-rose-900/60 active:bg-rose-900 text-rose-300 hover:text-white text-lg sm:text-xl font-bold border border-slate-800 hover:border-rose-500/50 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                전체 삭제
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="h-16 sm:h-20 rounded-2xl bg-slate-800/80 hover:bg-indigo-600 active:bg-indigo-700 text-2xl sm:text-3xl font-black text-white shadow-md border border-slate-700/60 hover:border-indigo-500 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                className="h-16 sm:h-20 rounded-2xl bg-slate-800/50 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white text-lg sm:text-xl font-bold border border-slate-800 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                지우기 ⌫
              </button>
            </div>

            {/* Manual Confirm Button if 4 digits ready */}
            {phoneDigits.length === 4 && (
              <button
                type="button"
                onClick={() => handleLookup(phoneDigits)}
                className="mt-6 w-full max-w-sm h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-xl shadow-indigo-600/30 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer animate-in fade-in"
              >
                조회하기
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* STEP 2: LOOKUP LOADING */}
        {step === 'LOOKUP_LOADING' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <User className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">원생 정보를 조회하고 있습니다</h3>
            <p className="text-sm text-slate-400">잠시만 기다려 주세요...</p>
          </div>
        )}

        {/* STEP 3: STUDENT & CLASS SELECTION */}
        {step === 'SELECT' && (
          <div className="w-full max-w-xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Subtitle */}
            <div className="text-center mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                조회 완료
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {selectedStudent ? `${selectedStudent.studentName} 학생, 반가워요!` : '학생을 선택해 주세요'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                등원 또는 하원 버튼을 터치하여 1초 출결을 완료하세요
              </p>
            </div>

            {/* Multiple Sibling Selection Cards (if > 1 match) */}
            {matches.length > 1 && (
              <div className="w-full mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  번호가 일치하는 학생 ({matches.length}명)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matches.map((student) => {
                    const isPicked = selectedStudent?.studentId === student.studentId;
                    return (
                      <button
                        key={student.studentId}
                        type="button"
                        onClick={() => {
                          playSound('tap');
                          setSelectedStudent(student);
                          if (student.classes.length > 0) {
                            setSelectedClass(student.classes[0]);
                          } else {
                            setSelectedClass(null);
                          }
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between ${
                          isPicked
                            ? 'border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-600/20 text-white'
                            : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-sm">
                            {student.studentName.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-base font-bold">{student.studentName}</p>
                            <p className="text-xs text-slate-400">
                              {student.classes.length > 0 ? student.classes[0].name : '배정 반 없음'}
                            </p>
                          </div>
                        </div>
                        {isPicked && <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Target Class Selection (if selected student has multiple classes) */}
            {selectedStudent && selectedStudent.classes.length > 1 && (
              <div className="w-full mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  오늘 출석할 수업 반 선택
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedStudent.classes.map((cls) => {
                    const isSelected = selectedClass?.id === cls.id;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          playSound('tap');
                          setSelectedClass(cls);
                        }}
                        className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate">{cls.name}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Student Info Card (Active Target) */}
            {selectedStudent && (
              <div className="w-full p-4 mb-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-600/30">
                    {selectedStudent.studentName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{selectedStudent.studentName} 학생</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        인증됨
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      {selectedClass ? selectedClass.name : selectedStudent.classes[0]?.name || '수업'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetToKeypad}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  다른 번호
                </button>
              </div>
            )}

            {/* Big 1-Second Check-in Action Buttons */}
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              {/* CHECK_IN (등원) */}
              <button
                type="button"
                disabled={!selectedStudent}
                onClick={() => handleCheckIn('CHECK_IN')}
                className="h-28 sm:h-32 rounded-3xl bg-linear-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 active:from-emerald-600 active:to-emerald-800 text-white font-black shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl tracking-tight">등원 체크인</p>
                  <p className="text-[11px] text-emerald-100 font-medium opacity-90">학원에 도착했어요 🎒</p>
                </div>
              </button>

              {/* CHECK_OUT (하원) */}
              <button
                type="button"
                disabled={!selectedStudent}
                onClick={() => handleCheckIn('CHECK_OUT')}
                className="h-28 sm:h-32 rounded-3xl bg-linear-to-b from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 active:from-indigo-600 active:to-indigo-800 text-white font-black shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <LogOut className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl tracking-tight">하원 체크아웃</p>
                  <p className="text-[11px] text-indigo-100 font-medium opacity-90">집으로 귀가해요 🏠</p>
                </div>
              </button>
            </div>

            {/* Back to Keypad Cancel Button */}
            <button
              type="button"
              onClick={resetToKeypad}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              처음 화면으로 돌아가기
            </button>
          </div>
        )}

        {/* STEP 4: CHECKING IN PROGRESS */}
        {step === 'CHECKING' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">출결을 기록하고 있습니다</h3>
            <p className="text-sm text-slate-400">안심 알림톡 발송 중...</p>
          </div>
        )}

        {/* STEP 5: SUCCESS CELEBRATION */}
        {step === 'SUCCESS' && checkInResult && (
          <div className="w-full max-w-md flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Animated Celebration Icon */}
            <div
              className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-bounce ${
                checkInResult.type === 'CHECK_IN'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                  : 'bg-indigo-600 text-white shadow-indigo-600/40'
              }`}
            >
              <CheckCircle2 className="w-14 h-14" />
            </div>

            {/* Main Success Title */}
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              {checkInResult.type === 'CHECK_IN' ? '등원 완료! 🎒' : '하원 완료! 🏠'}
            </h2>

            {/* Student & Class Details */}
            <div className="w-full p-6 my-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <p className="text-xl font-black text-white mb-1">
                {checkInResult.studentName} 학생
              </p>
              <p className="text-sm text-indigo-400 font-semibold mb-4">
                {checkInResult.className}
              </p>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="text-slate-400">체크 시각</span>
                <span className="font-mono font-bold text-white text-base">
                  {currentTime?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="mt-3 py-2 px-3 rounded-xl bg-slate-800/60 text-xs text-slate-300 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>학부모님께 안심 출결 알림이 발송되었습니다.</span>
              </div>
            </div>

            {/* Friendly Greeting */}
            <p className="text-sm text-slate-300 mb-6 font-medium">
              {checkInResult.type === 'CHECK_IN'
                ? '오늘도 힘차게 공부해 봐요! 파이팅! ✨'
                : '오늘 하루도 수고 많았어요! 조심히 귀가하세요. 👋'}
            </p>

            {/* Next Student Instant Reset Button with Countdown */}
            <button
              type="button"
              onClick={resetToKeypad}
              className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-base transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              다음 학생 출석하기 ({countdown}초 후 자동 복귀)
            </button>
          </div>
        )}

        {/* STEP 6: ERROR FEEDBACK */}
        {step === 'ERROR' && (
          <div className="w-full max-w-md flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-6 shadow-xl shadow-rose-500/20">
              <AlertCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              출결 체크 실패
            </h2>

            <div className="w-full p-5 my-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-sm leading-relaxed whitespace-pre-line">
              {errorMessage}
            </div>

            <button
              type="button"
              onClick={resetToKeypad}
              className="mt-4 w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              다시 입력하기
            </button>
          </div>
        )}
      </main>

      {/* 3. Kiosk Footer Info */}
      <footer className="h-12 px-6 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>키오스크 시스템 실시간 가동 중</span>
        </div>
        <div>
          <span>ClassHelper Kiosk v1.0 • 터치 친화형 고속 모드</span>
        </div>
      </footer>
    </div>
  );
}
