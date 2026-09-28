import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  CheckCircle2,
  X,
  KeyRound,
  ShieldCheck,
  Clock,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const LoginPage = () => {
  const {
    user,
    isAuthenticated,
    login,
    loginWithGoogle,
    signUpWithEmail,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    updatePasswordAfterReset,
    findUserByPhone,
    resetPasswordWithPhone,
    ownerEmail,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect automatically
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === 'ADMIN' ? '/dashboard' : '/kasir';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Sync email passed from VerifyEmail or registration
  useEffect(() => {
    if (location.state?.email) {
      setLoginIdentifier(location.state.email);
    }
  }, [location.state]);

  // Mode: 'LOGIN' | 'REGISTER'
  const [mode, setMode] = useState('LOGIN');

  // Form states - Login
  const [loginIdentifier, setLoginIdentifier] = useState(
    location.state?.email || sessionStorage.getItem('puko_verify_email') || ''
  );
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // UI status
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ==============================================================
  // Modal Pemulihan Kata Sandi (Simpel: Gmail / No HP)
  // Step: 'EMAIL' | 'OTP' | 'NEW_PASSWORD'
  // ==============================================================
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('EMAIL');
  const [forgotMethod, setForgotMethod] = useState('EMAIL'); // 'EMAIL' | 'PHONE'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState(['', '', '', '', '', '']);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const otpInputRefs = useRef([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (isForgotModalOpen && forgotStep === 'OTP' && forgotCountdown > 0) {
      timer = setTimeout(() => setForgotCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isForgotModalOpen, forgotStep, forgotCountdown]);

  // Auto-focus first input when moving to OTP step
  useEffect(() => {
    if (isForgotModalOpen && forgotStep === 'OTP') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isForgotModalOpen, forgotStep]);

  // Switch mode helper
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

  // 1. Submit LOGIN (Username/Email/Phone + Password)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const result = await login(loginIdentifier, loginPassword);

      if (result.success) {
        playSuccessSound();
        const redirectPath = result.user.role === 'ADMIN' ? '/dashboard' : '/kasir';
        navigate(redirectPath, { replace: true });
      } else {
        if (result.code === 'EMAIL_NOT_CONFIRMED') {
          navigate('/verify-email', {
            state: { email: result.email || loginIdentifier },
          });
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat masuk. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit LOGIN DENGAN GOOGLE
  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');
    setIsGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setError(res.message);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menghubungkan dengan Google. Coba lagi.');
      setIsGoogleLoading(false);
    }
  };

  // 3. Submit REGISTER
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpWithEmail(regName, regEmail, regPassword);

      if (result.needsConfirmation) {
        navigate('/verify-email', {
          state: { email: result.email },
        });
      } else {
        playSuccessSound();
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal. Pastikan email Anda valid.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================================================
  // Handlers untuk Lupa Password via Gmail
  // ==============================================================
  // Step 1: Kirim Kode OTP ke Gmail
  const handleSendGmailOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    setIsSendingForgot(true);

    try {
      const cleanEmail = (forgotEmail || '').trim().toLowerCase();
      if (!cleanEmail) {
        setForgotError('Masukkan alamat email Gmail akun Anda.');
        setIsSendingForgot(false);
        return;
      }

      await sendPasswordResetOtp(cleanEmail);
      playSuccessSound();
      setForgotCountdown(60);
      setForgotStep('OTP');
      setForgotOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setForgotError(err.message || 'Gagal mengirim kode ke Gmail. Coba lagi.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  // Step 2: Kirim Ulang Kode
  const handleResendGmailOtp = async () => {
    if (forgotCountdown > 0 || isSendingForgot) return;
    await handleSendGmailOtp();
  };

  // Step 2: Digit change handlers
  const handleOtpDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const next = [...forgotOtpDigits];
      next[index] = '';
      setForgotOtpDigits(next);
      return;
    }

    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split('');
      const next = [...forgotOtpDigits];
      chars.forEach((c, idx) => {
        if (index + idx < 6) next[index + idx] = c;
      });
      setForgotOtpDigits(next);
      const nextFocus = Math.min(index + chars.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const next = [...forgotOtpDigits];
    next[index] = cleanVal;
    setForgotOtpDigits(next);
    if (index < 5 && cleanVal) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;
    const chars = pasteData.split('');
    const next = ['', '', '', '', '', ''];
    chars.forEach((c, idx) => {
      if (idx < 6) next[idx] = c;
    });
    setForgotOtpDigits(next);
    const nextFocus = Math.min(chars.length, 5);
    otpInputRefs.current[nextFocus]?.focus();
  };

  // Step 2: Verifikasi Kode OTP dari Gmail
  const handleVerifyGmailOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');

    const token = forgotOtpDigits.join('').trim();
    if (token.length !== 6) {
      setForgotError('Masukkan 6 digit kode OTP secara lengkap.');
      return;
    }

    setIsSendingForgot(true);
    try {
      await verifyPasswordResetOtp(forgotEmail, token);
      playSuccessSound();
      setForgotStep('NEW_PASSWORD');
    } catch (err) {
      setForgotError(err.message || 'Kode OTP salah atau sudah kadaluarsa.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  // Step 1: Verifikasi Nomor HP Pemilik
  const handleVerifyPhone = (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    const clean = (forgotPhone || '').replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      setForgotError('Masukkan nomor HP akun Anda.');
      return;
    }

    const matched = findUserByPhone(clean);
    if (!matched) {
      setForgotError('Nomor HP tidak cocok dengan akun terdaftar.');
      return;
    }

    playSuccessSound();
    setForgotEmail(matched.email || '');
    setForgotStep('NEW_PASSWORD');
  };

  // Step 3: Simpan Sandi Baru
  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (newPassword.length < 6) {
      setForgotError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSendingForgot(true);
    try {
      if (forgotMethod === 'PHONE' || !forgotOtpDigits.join('')) {
        const resPhone = resetPasswordWithPhone(forgotPhone, newPassword);
        if (!resPhone.success) {
          throw new Error(resPhone.message);
        }
      }
      const res = await updatePasswordAfterReset(forgotEmail, newPassword);
      playSuccessSound();
      setSuccessMessage(res.message || 'Kata sandi berhasil diperbarui! Silakan masuk.');
      setLoginIdentifier(forgotEmail || 'admin');
      setLoginPassword(newPassword);
      closeForgotModal();
    } catch (err) {
      setForgotError(err.message || 'Gagal menyimpan kata sandi baru.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotStep('EMAIL');
    setForgotMethod('EMAIL');
    setForgotEmail('');
    setForgotPhone('');
    setForgotOtpDigits(['', '', '', '', '', '']);
    setForgotCountdown(0);
    setForgotError('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-slate-100 to-slate-200 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden selection:bg-puko-500 selection:text-white">
      {/* Decorative background glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-puko-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-block relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden bg-white p-1 shadow-xl border border-slate-200/90 ring-4 ring-puko-500/15">
              <img
                src="/logo.png"
                alt="PUKO Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900">
              PUKO POS
            </h1>
            <p className="text-xs font-bold text-slate-500 tracking-wide mt-0.5">
              Alpukat Kocok No Serat No Pahit
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/5 space-y-5">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* 1. LOGIN FORM                                                  */}
          {/* ============================================================== */}
          {mode === 'LOGIN' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Masuk ke Aplikasi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan username, no. HP, atau email Gmail terdaftar
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama / Username / No. HP / Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Contoh: Owner, 0856xxxxxx, atau Gmail"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-xs text-puko-700 hover:text-puko-800 font-bold hover:underline cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan password"
                      required
                      className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-mono ${
                        showLoginPassword ? 'tracking-normal font-bold' : 'tracking-widest font-bold'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showLoginPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Tombol Masuk Biasa */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-puko-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Masuk</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider ATAU */}
                <div className="relative my-3 pt-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2.5 text-slate-400 font-extrabold tracking-wider">
                      Atau
                    </span>
                  </div>
                </div>

                {/* Tombol Masuk Menggunakan Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-sm shadow-xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Menghubungkan ke Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.39 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.13z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                        />
                      </svg>
                      <span>Masuk Menggunakan Google</span>
                    </>
                  )}
                </button>
              </form>

              {/* Link ke Pendaftaran */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Belum memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('REGISTER')}
                    className="font-extrabold text-puko-700 hover:text-puko-800 hover:underline cursor-pointer"
                  >
                    Daftar di sini
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. REGISTER FORM                                               */}
          {/* ============================================================== */}
          {mode === 'REGISTER' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Daftar Akun Baru
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftarkan email Anda untuk mengelola kasir & toko PUKO
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Contoh: Owner PUKO"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alamat Email (Gmail)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="alpukatkocokpuko@gmail.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kata Sandi (Minimal 6 Karakter)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ulangi Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi di atas"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-puko-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Daftar Akun</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Link kembali ke Login */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('LOGIN')}
                    className="font-extrabold text-puko-700 hover:text-puko-800 hover:underline cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          PUKO Alpukat Kocok &copy; {new Date().getFullYear()} &bull; Sistem Kasir POS
        </p>
      </div>

      {/* ============================================================== */}
      {/* Modal Lupa Password via Gmail (Pilihan A: 3 Langkah)             */}
      {/* ============================================================== */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-puko-100 text-puko-800 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4 text-puko-700" />
                </div>
                <h3 className="font-black text-slate-900 text-base">
                  {forgotStep === 'NEW_PASSWORD' ? 'Buat Sandi Baru' : 'Lupa Sandi'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message inside modal */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-semibold">{forgotError}</span>
              </div>
            )}

            {/* ========================================================== */}
            {/* STEP 1: PILIHAN VERIFIKASI (GMAIL / NO. HP)                */}
            {/* ========================================================== */}
            {forgotStep === 'EMAIL' && (
              <div className="space-y-4">
                {/* Pilihan Metode: Gmail atau No HP */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMethod('EMAIL');
                      setForgotError('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      forgotMethod === 'EMAIL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gmail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMethod('PHONE');
                      setForgotError('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      forgotMethod === 'PHONE'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Nomor HP</span>
                  </button>
                </div>

                {/* Sub-form: Gmail */}
                {forgotMethod === 'EMAIL' ? (
                  <form onSubmit={handleSendGmailOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Alamat Email (Gmail)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="contoh@gmail.com"
                          required
                          autoFocus
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-sans transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={closeForgotModal}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingForgot || !forgotEmail.trim()}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-puko-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSendingForgot ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengirim Kode...</span>
                          </>
                        ) : (
                          <>
                            <span>Kirim Kode</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Sub-form: Nomor HP */
                  <form onSubmit={handleVerifyPhone} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nomor HP
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          value={forgotPhone}
                          onChange={(e) => setForgotPhone(e.target.value)}
                          placeholder="081234567890"
                          required
                          autoFocus
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={closeForgotModal}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingForgot || !forgotPhone.trim()}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-puko-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Lanjut</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ========================================================== */}
            {/* STEP 2: VERIFIKASI KODE OTP DARI GMAIL                     */}
            {/* ========================================================== */}
            {forgotStep === 'OTP' && (
              <form onSubmit={handleVerifyGmailOtp} className="space-y-4">
                {/* Info Box */}
                <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5 text-center space-y-1.5">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-xs">
                      Kode OTP Telah Dikirim!
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Periksa kotak masuk (atau folder <b>Spam</b>) di Gmail:
                    </p>
                    <span className="inline-block mt-1 font-mono font-bold text-xs text-emerald-950 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {forgotEmail}
                    </span>
                  </div>
                </div>

                {/* 6 Digit Inputs */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    Masukkan 6 Digit Angka dari Gmail
                  </label>

                  <div
                    className="flex items-center justify-center gap-2 sm:gap-2.5"
                    onPaste={handleOtpPaste}
                  >
                    {forgotOtpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all font-mono outline-none shadow-xs ${
                          digit
                            ? 'border-puko-600 bg-puko-50/50 text-slate-900 ring-2 ring-puko-500/20'
                            : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-puko-500 focus:bg-white focus:ring-4 focus:ring-puko-500/15'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Resend Cooldown & Ubah Email */}
                  <div className="flex items-center justify-between text-xs mt-3 text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('EMAIL')}
                      className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Ganti Email</span>
                    </button>

                    <div>
                      {forgotCountdown > 0 ? (
                        <span className="text-slate-400 font-medium">
                          Kirim ulang ({forgotCountdown}s)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendGmailOtp}
                          disabled={isSendingForgot}
                          className="font-extrabold text-puko-700 hover:text-puko-800 hover:underline cursor-pointer transition-colors"
                        >
                          Kirim Ulang Kode
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForgot || forgotOtpDigits.join('').length !== 6}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-puko-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingForgot ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Verifikasi Kode OTP</span>
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================== */}
            {/* STEP 3: BUAT KATA SANDI BARU                               */}
            {/* ========================================================== */}
            {forgotStep === 'NEW_PASSWORD' && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                {/* Verified Account Badge */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-extrabold text-emerald-950 block">
                      Verifikasi Berhasil!
                    </span>
                    <p className="text-[11px] text-emerald-700 truncate mt-0.5">
                      Silakan buat kata sandi baru untuk akun Anda.
                    </p>
                  </div>
                </div>

                {/* Input New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kata Sandi Baru (Minimal 6 Karakter)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      autoFocus
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Input Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ulangi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForgot}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-puko-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingForgot ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan Sandi Baru & Masuk</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
